import { Schema, model } from "mongoose";

export interface IParameterSchema {
    key: string;
    value: string;
    createdAt?: Date;
    modifiedAt?: Date;
}

const parameterSchema = new Schema<IParameterSchema>({
    key: { type: String, required: true, index: true },
    value: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    modifiedAt: { type: Date,required: false },
});

const Parameter = model<IParameterSchema>("Parameter", parameterSchema);

export default Parameter;