import { TypedEmitter } from "tiny-typed-emitter";
import { PositionInfo, QueueLength } from '@mycelium-ethereum/swaps-js';
import { FastPriceFeed, PositionRouter } from "@mycelium-ethereum/perpetual-swaps-contracts";
import PriceFeed, { UpdateResult } from "./PriceFeed";
import { checkedPositionRequests } from '../utils/prometheus';
import { logger } from '../utils/logger'
import priceStore  from "../services/prices";
import { getRequestQueueLengths, getExecutableEndIndex, getGreedyQueueLengths } from "../utils";


interface IPositionKeeper {
    maxExecutionRetry: number,
    maxExecutableChunk: number,
}

interface PositionEvents {
  'executed': (e: UpdateResult) => void;
}

export default class PositionKeeper extends TypedEmitter<PositionEvents> {
    retryCount: number;
    pendingOrderExecution: Promise<void> | undefined;
    lastQueueLength: QueueLength | undefined;

    priceFeed: PriceFeed | undefined;

    // constants
    MAX_EXECUTION_RETRY: number;
    MAX_EXECUTABLE_CHUNK: number;

    constructor({ maxExecutableChunk, maxExecutionRetry }: IPositionKeeper) {
        super();
        this.retryCount = 0

        this.MAX_EXECUTION_RETRY = maxExecutionRetry;
        this.MAX_EXECUTABLE_CHUNK = maxExecutableChunk;
    }

    /**
     * Executes outstanding orders if there are any
     */
    async executeOutstandingOrders (priceFeed: PriceFeed, fastFeedContract: FastPriceFeed, positionRouter: PositionRouter) {
        const queueLengths = await getRequestQueueLengths(positionRouter);
        this.lastQueueLength = queueLengths;
        const {
            startIndexForIncreasePositions,
            endIndexForIncreasePositions,
            startIndexForDecreasePositions,
            endIndexForDecreasePositions,
        } = queueLengths;

        if (
            startIndexForIncreasePositions !== endIndexForIncreasePositions ||
            startIndexForDecreasePositions !== endIndexForDecreasePositions
        ) {
            if (this.shouldExecute()) {
                logger.info("Executing outstanding orders", { startIndexForDecreasePositions, startIndexForIncreasePositions, endIndexForDecreasePositions, endIndexForIncreasePositions })
                this.pendingOrderExecution = this.greedyExecuteOrders(priceFeed, fastFeedContract, positionRouter).finally(() => {
                    this.resetExecutionState();
                });
            } else {
                logger.warn("Skipped outstanding order execution: already processing order execution")
            }
        }
        checkedPositionRequests.inc()
    }

    /**
     * Greedily execute orders more than the set queLength
     */
    public async greedyExecuteOrders (priceFeed: PriceFeed, fastFeedContract: FastPriceFeed, positionRouter: PositionRouter) {
        const greedyQueueLengths = getGreedyQueueLengths(this.MAX_EXECUTABLE_CHUNK,);
        return this.executeOrders(priceFeed, fastFeedContract, positionRouter, greedyQueueLengths);
    }

    /**
     * Executes orders with priceFeed.setPricesWithBitsAndExecute
     * Failsafe function that will attempt multiple calls as well as
     *  fallback on a secondary provider
     * Will retry if;
     *  - the txn fails
     *  - not all orders have been executed due to;
     *   - receiving a new order whilst processing a previous order
     *   - number of orders to execute was capped at MAX_EXECUTABLE_CHUNK
     *   - txn success but no orders were executed/cancelled
     */
    public async executeOrders (priceFeed: PriceFeed, fastFeedContract: FastPriceFeed, positionRouter: PositionRouter, queueLengths?: QueueLength) {
        let queueLengthsToExecute = queueLengths;
        if (!queueLengthsToExecute) {
            queueLengthsToExecute = await getRequestQueueLengths(positionRouter);
        }
        const endIndexForIncreasePositions = getExecutableEndIndex(queueLengthsToExecute.startIndexForIncreasePositions, queueLengthsToExecute.endIndexForIncreasePositions, this.MAX_EXECUTABLE_CHUNK)
        const endIndexForDecreasePositions  = getExecutableEndIndex(queueLengthsToExecute.startIndexForDecreasePositions, queueLengthsToExecute.endIndexForDecreasePositions, this.MAX_EXECUTABLE_CHUNK)

        logger.info("Attempting to execute orders", { ...queueLengthsToExecute });
        const medianPrices = priceStore.getMedianPrices();

        if (medianPrices && priceFeed) {
            const result = await priceFeed.updatePricesWithBitsAndExecute(fastFeedContract, medianPrices, endIndexForIncreasePositions, endIndexForDecreasePositions)
            if (result) {
                this.emit('executed', result)
            }

            // recall if order execution is fine but there are difference in queueLengths
            const queueLengths = await getRequestQueueLengths(positionRouter);
            if (
                queueLengths.startIndexForIncreasePositions !== queueLengths.endIndexForIncreasePositions ||
                queueLengths.startIndexForDecreasePositions !== queueLengths.endIndexForDecreasePositions
            ) {
                logger.warn("Not all orders executed", { ...queueLengths });

                // check that atleast one order was processed (executed/cancelled) and queLength startIndexes have changed
                if (
                    queueLengths.startIndexForIncreasePositions !== queueLengthsToExecute.startIndexForIncreasePositions ||
                    queueLengths.startIndexForDecreasePositions !== queueLengthsToExecute.startIndexForDecreasePositions
                ) {
                    // as long as some orders are being executed each time we should keep trying to execute
                    await this.executeOrders(priceFeed, fastFeedContract, positionRouter);
                } else {
                    // neither an increaseOrder or decreaseOrder was successfully processed
                    // in this case something is most probably wrong and we should try again but avoid the infinite loop
                    if (this.retryCount < this.MAX_EXECUTION_RETRY) {
                        this.retryCount += 1;
                        await this.executeOrders(priceFeed, fastFeedContract, positionRouter);
                    } else {
                        logger.warn("Exceeded executeOrders max retry count", { retryCount: this.retryCount });
                    }
                }
            }
        }
    }

    /**
     * DecreasePosition event handler
     * Triggers order execution or skips if the keeper is currently already executing orders
     */
    async handleDecreasePosition(
        priceFeed: PriceFeed,
        fastFeedContract: FastPriceFeed,
        positionRouter: PositionRouter,
        {
            account,
            path,
            indexToken,
            isLong,
            blockNumber
        }: PositionInfo
    ) {
        // log enough to get position later
        logger.info("Handling decrease position", { account, collateralToken: path[path.length - 1], indexToken, isLong, blockNumber });
        if (this.shouldExecute()) {
            this.pendingOrderExecution = this.greedyExecuteOrders(priceFeed, fastFeedContract, positionRouter).finally(() => {
                this.resetExecutionState();
            });
        } else {
            logger.warn("Skipped executing decrease position", { account, collateralToken: path[path.length - 1], indexToken, isLong, blockNumber });
        }
    }

    /**
     * IncreasePosition event handler
     * Triggers order execution or skips if the keeper is currently already executing orders
     */
    async handleIncreasePosition (
        priceFeed: PriceFeed,
        fastFeedContract: FastPriceFeed,
        positionRouter: PositionRouter,
        {
            account,
            path,
            indexToken,
            isLong,
            blockNumber
        }: PositionInfo
    ) {
        // log enough to get position later
        logger.info("Handling increase position", { account, collateralToken: path[path.length - 1], indexToken, isLong, blockNumber });
        if (this.shouldExecute()) {
            this.pendingOrderExecution = this.greedyExecuteOrders(priceFeed, fastFeedContract, positionRouter).finally(() => {
                this.resetExecutionState();
            });
        } else {
            logger.warn("Skipped executing increase position", { account, collateralToken: path[path.length - 1], indexToken, isLong, blockNumber });
        }
    }

    /**
     * Checks if the PositionKeeper should execute orders
     */
    shouldExecute (): boolean {
        // dont execute if it is currently processing an execution
        if (this.pendingOrderExecution) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Resets state after executing orders
     */
    resetExecutionState () {
        this.pendingOrderExecution = undefined;
        this.retryCount = 0;
    }
}
