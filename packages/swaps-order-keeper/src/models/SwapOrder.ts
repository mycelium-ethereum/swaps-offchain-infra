import mongoose from "mongoose";

export interface SwapOrderAttrs {
    orderIndex: number;
    account: string;
    path: string[];
    amountIn: string;
    minOut: string;
    triggerRatio: string;
    triggerAboveThreshold: boolean;
    shouldUnwrap: boolean;
    executionFee: string;
}

const SwapOrderSchema = new mongoose.Schema<SwapOrderAttrs>({
    orderIndex: { type: Number, required: true },
    account: { type: String, required: true },
    path: { type: [String], required: true },
    amountIn: { type: String, required: true },
    minOut: { type: String, required: true },
    triggerRatio: { type: String, required: true },
    triggerAboveThreshold: { type: Boolean, required: true },
    executionFee: { type: String, required: true },
});

export default mongoose.model<SwapOrderAttrs>("SwapOrder", SwapOrderSchema, "swapOrders");
