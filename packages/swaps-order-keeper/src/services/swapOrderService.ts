import { LogDescription } from "@ethersproject/abi";
import SwapOrder from "../models/SwapOrder";

export default class SwapOrderService {
    public async createFromEvent(event: LogDescription) {
        const foundOrder = await SwapOrder.findOne({
            account: event.args.account,
            orderIndex: event.args.orderIndex,
        });

        if (!foundOrder) {
            const order = new SwapOrder({
                orderIndex: event.args.orderIndex,
                account: event.args.account,
                path: event.args.path,
                amountIn: event.args.amountIn.toString(),
                minOut: event.args.minOut.toString(),
                triggerRatio: event.args.triggerRatio.toString(),
                triggerAboveThreshold: event.args.triggerAboveThreshold,
                shouldUnwrap: event.args.shouldUnwrap,
                executionFee: event.args.executionFee.toString(),
            });
            await order.save();
            console.log(`Created SwapOrder ${event.args.account}:${event.args.orderIndex}`);
            return order;
        } else {
            console.log(`SwapOrder ${event.args.account}:${event.args.orderIndex} already exists`);
            return foundOrder;
        }
    }

    public async updateFromEvent(event: LogDescription) {
        const order = await SwapOrder.findOne({
            orderIndex: event.args.orderIndex,
            account: event.args.account,
        });
        if (order) {
            order.minOut = event.args.minOut.toString();
            order.triggerRatio = event.args.triggerRatio.toString();
            order.triggerAboveThreshold = event.args.triggerAboveThreshold;
            await order.save();
            console.log(`Updated SwapOrder ${event.args.account}:${event.args.orderIndex}`);
            return order;
        }
    }

    public async delete(account: string, orderIndex: number) {
        await SwapOrder.deleteMany({ account, orderIndex });
        console.log(`Deleted SwapOrder ${account}:${orderIndex}`);
    }
}
