import { LogDescription } from "@ethersproject/abi";
import DecreaseOrder from "../models/DecreaseOrder";

export default class DecreaseOrderService {
    public async createFromEvent(event: LogDescription) {
        const foundOrder = await DecreaseOrder.findOne({
            account: event.args.account,
            orderIndex: event.args.orderIndex,
        });

        if (!foundOrder) {
            const order = new DecreaseOrder({
                orderIndex: event.args.orderIndex,
                account: event.args.account,
                collateralToken: event.args.collateralToken,
                collateralDelta: event.args.collateralDelta.toString(),
                indexToken: event.args.indexToken,
                sizeDelta: event.args.sizeDelta.toString(),
                isLong: event.args.isLong,
                triggerPrice: event.args.triggerPrice.toString(),
                triggerAboveThreshold: event.args.triggerAboveThreshold,
                executionFee: event.args.executionFee.toString(),
            });
            await order.save();
            console.log(`Created DecreaseOrder ${event.args.account}:${event.args.orderIndex}`);
            return order;
        } else {
            console.log(`DecreaseOrder ${event.args.account}:${event.args.orderIndex} already exists`);
            return foundOrder;
        }
    }

    public async updateFromEvent(event: LogDescription) {
        const order = await DecreaseOrder.findOne({
            orderIndex: event.args.orderIndex,
            account: event.args.account,
        });
        if (order) {
            order.collateralDelta = event.args.collateralDelta.toString();
            order.sizeDelta = event.args.sizeDelta.toString();
            order.triggerPrice = event.args.triggerPrice.toString();
            order.triggerAboveThreshold = event.args.triggerAboveThreshold;
            await order.save();
            console.log(`Updated DecreaseOrder ${event.args.account}:${event.args.orderIndex}`);
        }
    }

    public async delete(account: string, orderIndex: number) {
        await DecreaseOrder.deleteMany({ account, orderIndex });
        console.log(`Deleted DecreaseOrder ${account}:${orderIndex}`);
    }
}
