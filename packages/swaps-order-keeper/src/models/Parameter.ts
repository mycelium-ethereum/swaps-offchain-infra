import mongoose from "mongoose";

export interface ParameterAttrs {
    name: string;
    value: string;
}

const parameterSchema = new mongoose.Schema<ParameterAttrs>({
    name: { type: String, required: true },
    value: { type: String, required: true },
});

export default mongoose.model<ParameterAttrs>("Parameter", parameterSchema);
