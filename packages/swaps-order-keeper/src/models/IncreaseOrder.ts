import mongoose from "mongoose";

export interface IncreaseOrderAttrs {
    orderIndex: number;
    account: string;
    purchaseToken: string;
    purchaseTokenAmount: string;
    collateralToken: string;
    indexToken: string;
    sizeDelta: string;
    isLong: boolean;
    triggerPrice: string;
    triggerAboveThreshold: boolean;
    executionFee: string;
}

const increaseOrderSchema = new mongoose.Schema<IncreaseOrderAttrs>({
    orderIndex: { type: Number, required: true },
    account: { type: String, required: true },
    purchaseToken: { type: String, required: true },
    purchaseTokenAmount: { type: String, required: true },
    collateralToken: { type: String, required: true },
    indexToken: { type: String, required: true },
    sizeDelta: { type: String, required: true },
    isLong: { type: Boolean, required: true },
    triggerPrice: { type: String, required: true },
    triggerAboveThreshold: { type: Boolean, required: true },
    executionFee: { type: String, required: true },
});

export default mongoose.model<IncreaseOrderAttrs>("IncreaseOrder", increaseOrderSchema, "increaseOrders");
