import { ethers } from "ethers";

export type PositionInfo = {
    account: string;
    path: string[];
    indexToken: string;
    isLong: boolean;
    blockNumber: number;
};

export type QueueLength = {
    startIndexForIncreasePositions: number;
    endIndexForIncreasePositions: number;
    startIndexForDecreasePositions: number;
    endIndexForDecreasePositions: number;
};

export type HandleIncreasePosition = (args: {
    account: string;
    path: string[];
    indexToken: string;
    _collateralDelta: ethers.BigNumber;
    _sizeDelta: ethers.BigNumber;
    isLong: boolean;
    _receiver: string;
    _acceptablePrice: ethers.BigNumber;
    _minOut: ethers.BigNumber;
    _executionFee: ethers.BigNumber;
    _index: ethers.BigNumber;
    _blockNumber: ethers.BigNumber;
    _blockTime: ethers.BigNumber;
    txnInfo: { blockNumber: number };
}) => void;
