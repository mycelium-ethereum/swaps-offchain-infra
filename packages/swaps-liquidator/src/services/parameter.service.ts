import Parameter from "../models/parameter";


export interface IParameterService {
    createNewParameter: (
        key: string,
        value: string
    ) => Promise<void>;
    updateParameter: (key: string, value: string) => Promise<void>;
    deleteParameter: (key: string) => Promise<void>;
    getParameter: (key: string) => Promise<any>;
}

class ParameterService implements IParameterService {

    async getParameter(key: string) {
        try {
            const result= await Parameter.findOne({ key });
            
            return result;
        } catch (err: any) {
            throw new Error(err);
        }
    }    

    async createNewParameter(
        key: string,
        value: string
    ): Promise<void> {
        try {
            const foundParameter = await Parameter.findOne({ key });

            if (foundParameter) {
                return;
            }

            const newParameter = new Parameter({ key,
                value});

            await newParameter.save();
            console.log(`New parameter is saved. Key: ${key}`);
        } catch (err: any) {
            throw new Error(err);
        }
    }

    async updateParameter(key: string, value: string ): Promise<void> {
        try {
            await Parameter.findOneAndUpdate({ key }, { $set: { value: value ,modifiedAt: Date.now()} });
            console.log(`Parameter updated. Key: ${key}`);
        } catch (err: any) {
            throw new Error(err);
        }
    }


    async deleteParameter(key: string): Promise<void> {
        try {
            await Parameter.deleteOne({ key });
            console.log(`Position is closed. Key: ${key}`);
        } catch (err: any) {
            throw new Error(err);
        }
    }
}

export default ParameterService;
