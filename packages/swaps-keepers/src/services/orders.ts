import { TypedEmitter } from "tiny-typed-emitter";
import { ethers } from "ethers";
import { PositionInfo } from "@mycelium-ethereum/swaps-js";
import { PositionRouter } from "@mycelium-ethereum/perpetual-swaps-contracts";
import { executionSpeed } from "../utils/prometheus";

interface OrderEvents {
    increasePosition: ({ account, path, blockNumber, isLong, indexToken }: PositionInfo) => void;
    decreasePosition: ({ account, path, blockNumber, isLong, indexToken }: PositionInfo) => void;
}

const orderEmitter = new TypedEmitter<OrderEvents>();

// emit an increasePosition event
function handleIncreasePosition(
    account: string,
    path: string[],
    indexToken: string,
    _amountIn: ethers.BigNumber,
    _minOut: ethers.BigNumber,
    _sizeDelta: ethers.BigNumber,
    isLong: boolean,
    _acceptablePrice: ethers.BigNumber,
    _executionFee: ethers.BigNumber,
    _index: ethers.BigNumber,
    _blockNumber: ethers.BigNumber,
    _blockTime: ethers.BigNumber,
    _gasPrice: ethers.BigNumber,
    txnInfo: { blockNumber: number }
) {
    console.info("OrderEmitter found increasePosition, emitting event");
    orderEmitter.emit("increasePosition", {
        account,
        path,
        indexToken,
        isLong,
        blockNumber: txnInfo.blockNumber,
    });
}

// emit a decreasePosition event
function handleDecreasePosition(
    account: string,
    path: string[],
    indexToken: string,
    _collateralDelta: ethers.BigNumber,
    _sizeDelta: ethers.BigNumber,
    isLong: boolean,
    _receiver: string,
    _acceptablePrice: ethers.BigNumber,
    _minOut: ethers.BigNumber,
    _executionFee: ethers.BigNumber,
    _index: ethers.BigNumber,
    _blockNumber: ethers.BigNumber,
    _blockTime: ethers.BigNumber,
    txnInfo: { blockNumber: number }
) {
    console.info("OrderEmitter found decreasePosition, emitting event");
    orderEmitter.emit("decreasePosition", {
        account,
        path,
        indexToken,
        isLong,
        blockNumber: txnInfo.blockNumber,
    });
}

const storeTimeDiff = (args: any, timeDiffIndex: number) => {
    const timeDiff = args?.[timeDiffIndex];
    if (timeDiff && timeDiff?.toNumber) {
        executionSpeed.observe(timeDiff.toNumber());
    }
};

function streamOrders(positionRouter: PositionRouter): void {
    console.info(
        "Starting to stream CreateIncrease/DecreasePosition and ExecuteIncrease/DecreasePosition positionRouter events"
    );
    positionRouter.on("CreateDecreasePosition", handleDecreasePosition);
    positionRouter.on("CreateIncreasePosition", handleIncreasePosition);

    positionRouter.on("ExecuteIncreasePosition", (...args: any) => storeTimeDiff(args, 10));
    positionRouter.on("ExecuteDecreasePosition", (...args: any) => storeTimeDiff(args, 11));
}

export { streamOrders, orderEmitter };
