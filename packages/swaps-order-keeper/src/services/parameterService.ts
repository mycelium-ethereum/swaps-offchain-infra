import Parameter from "../models/Parameter";

export default class ParameterService {
    public async getParameter(name: string) {
        const parameter = await Parameter.findOne({ name });
        return parameter;
    }

    public async setParameter(name: string, value: string) {
        const parameter = await Parameter.findOne({ name });
        if (parameter) {
            parameter.value = value;
            return parameter.save();
        } else {
            const newParameter = new Parameter({ name, value });
            return newParameter.save();
        }
    }
}
