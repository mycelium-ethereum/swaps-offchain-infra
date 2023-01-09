import { Schema, model } from "mongoose";

export interface IPositionSchema {
    key: string;
    account: string;
    blockNumber: number;
    collateralToken: string;
    indexToken: string;
    isLong: boolean;
    createdAt?: Date;
    collateralAmount: string;
    size: string;
    averagePrice: string;
    entryFundingRate: string;
}

const positionSchema = new Schema<IPositionSchema>({
    key: { type: String, required: true },
    account: { type: String, required: true },
    blockNumber: { type: Number, required: false },
    collateralToken: { type: String, required: true },
    indexToken: { type: String, required: true },
    isLong: { type: Boolean, required: true },
    createdAt: { type: Date, default: Date.now },
    collateralAmount: { type: String, required: true },
    size: { type: String, required: true },
    averagePrice: { type: String, required: true },
    entryFundingRate: { type: String, required: true },
});

const Position = model<IPositionSchema>("Position", positionSchema);

export default Position;
