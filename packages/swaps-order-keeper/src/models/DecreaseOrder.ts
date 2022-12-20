import mongoose from "mongoose";

export interface DecreaseOrderAttrs {
    orderIndex: number;
    account: string;
    collateralToken: string;
    collateralDelta: string;
    indexToken: string;
    sizeDelta: string;
    isLong: boolean;
    triggerPrice: string;
    triggerAboveThreshold: boolean;
    executionFee: string;
}

const decreaseOrderSchema = new mongoose.Schema<DecreaseOrderAttrs>({
    orderIndex: { type: Number, required: true },
    account: { type: String, required: true },
    collateralToken: { type: String, required: true },
    collateralDelta: { type: String, required: true },
    indexToken: { type: String, required: true },
    sizeDelta: { type: String, required: true },
    isLong: { type: Boolean, required: true },
    triggerPrice: { type: String, required: true },
    triggerAboveThreshold: { type: Boolean, required: true },
    executionFee: { type: String, required: true },
});

export default mongoose.model<DecreaseOrderAttrs>("DecreaseOrder", decreaseOrderSchema, "decreaseOrders");
