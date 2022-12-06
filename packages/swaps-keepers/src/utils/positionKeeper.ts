import { ethers } from "ethers";
import { PositionRouter } from "@mycelium-ethereum/perpetual-swaps-contracts";
import { QueueLength } from "@mycelium-ethereum/swaps-js";
import { callContract } from "./providers";

/**
 * Gets the que lengths and parses them to js numbers
 */
export async function getRequestQueueLengths(positionRouter: PositionRouter): Promise<QueueLength> {
    // @ts-ignore type is unknown
    const queueLengths: ethers.BigNumber[] = await callContract(
        positionRouter,
        "getRequestQueueLengths",
        [],
        "positionRouter.getRequestQueueLengths()"
    );
    return {
        startIndexForIncreasePositions: queueLengths[0].toNumber(),
        endIndexForIncreasePositions: queueLengths[1].toNumber(),
        startIndexForDecreasePositions: queueLengths[2].toNumber(),
        endIndexForDecreasePositions: queueLengths[3].toNumber(),
    };
}

/**
 * Calculates the endIndex for orders to be executed.
 * The endIndex should be at most startIndex + MAX_EXECUTABLE_CHUNK.
 * This is to prevent UNPREDICTABLE_GAS_ESTIMATION errors from ethers when trying to submit a large
 *  amount of orders
 * @param {number} startIndex the start index of unexecuted orders. Should use PositionRouter.queueLengths
 * @param {number} endIndex the end index of unexecuted orders. Should use PositionRouter.queueLengths
 *
 * @returns {number} endIndex index to execute orders to
 */
export function getExecutableEndIndex(startIndex: number, endIndex: number, maxExecutableChunk: number): number {
    const numberOfOrdersToExecute = Math.min(
        // number of unexecuted orders
        endIndex - startIndex,
        maxExecutableChunk
    );
    return startIndex + numberOfOrdersToExecute;
}

export function getGreedyQueueLengths(
    maxExecutableChunk: number,
    lastQueueLength?: QueueLength
): QueueLength | undefined {
    if (lastQueueLength) {
        return {
            ...lastQueueLength,
            endIndexForDecreasePositions: lastQueueLength.endIndexForDecreasePositions + maxExecutableChunk,
            endIndexForIncreasePositions: lastQueueLength.endIndexForIncreasePositions + maxExecutableChunk,
        };
    }
}
