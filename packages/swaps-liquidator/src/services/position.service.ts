import Position, { IPositionSchema } from "../models/position";

export interface IPositionService {
    getPositions: () => Promise<IPositionSchema[]>;
    getPosition: (key: string) => Promise<IPositionSchema | null>;
    createNewPosition: (IPositionSchema) => Promise<IPositionSchema>;
    deletePosition: (key: string, blockNumber: number) => Promise<void>;
    updatePosition: (params: {
        key: string;
        blockNumber: number;
        collateralAmount?: string;
        size?: string;
        averagePrice?: string;
        entryFundingRate?: string;
    }) => Promise<IPositionSchema>;
    upsertPosition: (params: IPositionSchema) => Promise<IPositionSchema>;
}

class PositionService implements IPositionService {
    async getPositions(): Promise<IPositionSchema[]> {
        const docs = await Position.find();

        return docs;
    }

    async getPosition(key: string): Promise<IPositionSchema | null> {
        const position = await Position.findOne({ key });
        return position;
    }

    async createNewPosition(params): Promise<IPositionSchema> {
        try {
            const foundPosition = await Position.findOne({ key: params.key });
            if (foundPosition) {
                return foundPosition;
            }

            const newPosition = new Position(params);

            await newPosition.save();
            console.log(`New position is saved. Key: ${params.key}`);
            return newPosition;
        } catch (err: any) {
            throw new Error(err);
        }
    }

    async updatePosition(params: {
        key: string;
        blockNumber: number;
        collateralAmount?: string;
        size?: string;
        averagePrice?: string;
        entryFundingRate?: string;
    }): Promise<IPositionSchema> {
        try {
            const foundPosition = await Position.findOne({ key: params.key });
            if (!foundPosition) {
                throw new Error(`Position not found. Key: ${params.key}`);
            }

            foundPosition.blockNumber = params.blockNumber;
            if (params.collateralAmount) foundPosition.collateralAmount = params.collateralAmount;
            if (params.size) foundPosition.size = params.size;
            if (params.averagePrice) foundPosition.averagePrice = params.averagePrice;
            if (params.entryFundingRate) foundPosition.entryFundingRate = params.entryFundingRate;
            await foundPosition.save();
            console.log(`Position is updated. Key: ${params.key}`);
            return foundPosition;
        } catch (err) {
            throw new Error(err);
        }
    }

    async upsertPosition(params: IPositionSchema): Promise<IPositionSchema> {
        try {
            const foundPosition = await Position.findOne({ key: params.key });
            if (foundPosition) {
                foundPosition.blockNumber = params.blockNumber;
                foundPosition.collateralAmount = params.collateralAmount;
                foundPosition.size = params.size;
                foundPosition.averagePrice = params.averagePrice;
                foundPosition.entryFundingRate = params.entryFundingRate;
                await foundPosition.save();
                console.log(`Position is updated. Key: ${params.key}`);
                return foundPosition;
            } else {
                const newPosition = new Position(params);

                await newPosition.save();
                console.log(`New position is saved. Key: ${params.key}`);
                return newPosition;
            }
        } catch (err: any) {
            throw new Error(err);
        }
    }

    async deletePosition(key: string, blockNumber: number): Promise<void> {
        try {
            await Position.deleteMany({ key: key, blockNumber: { $lte: blockNumber } });
            console.log(`Position is deleted. Key: ${key}`);
        } catch (err: any) {
            throw new Error(err);
        }
    }
}

export default PositionService;
