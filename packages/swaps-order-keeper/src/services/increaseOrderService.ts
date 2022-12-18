import { LogDescription } from "@ethersproject/abi";
import IncreaseOrder from "../models/IncreaseOrder";

export default class IncreaseOrderService {
    public async createFromEvent(event: LogDescription) {
        const foundOrder = await IncreaseOrder.findOne({
            account: event.args.account,
            orderIndex: event.args.orderIndex,
        });

        if (!foundOrder) {
            const order = new IncreaseOrder({
                orderIndex: event.args.orderIndex,
                account: event.args.account,
                purchaseToken: event.args.purchaseToken,
                purchaseTokenAmount: event.args.purchaseTokenAmount.toString(),
                collateralToken: event.args.collateralToken,
                indexToken: event.args.indexToken,
                sizeDelta: event.args.sizeDelta.toString(),
                isLong: event.args.isLong,
                triggerPrice: event.args.triggerPrice.toString(),
                triggerAboveThreshold: event.args.triggerAboveThreshold,
                executionFee: event.args.executionFee.toString(),
            });
            await order.save();
            console.log(`Created IncreaseOrder ${event.args.account}:${event.args.orderIndex}`);
            return order;
        } else {
            console.log(`IncreaseOrder ${event.args.account}:${event.args.orderIndex} already exists`);
            return foundOrder;
        }
    }

    public async updateFromEvent(event: LogDescription) {
        const order = await IncreaseOrder.findOne({
            orderIndex: event.args.orderIndex,
            account: event.args.account,
        });
        if (order) {
            order.sizeDelta = event.args.sizeDelta.toString();
            order.triggerPrice = event.args.triggerPrice.toString();
            order.triggerAboveThreshold = event.args.triggerAboveThreshold;
            await order.save();

            console.log(`Updated IncreaseOrder ${event.args.account}:${event.args.orderIndex}`);
            return order;
        }
    }

    public async delete(account: string, orderIndex: number) {
        await IncreaseOrder.deleteMany({ account, orderIndex });
        console.log(`Deleted IncreaseOrder ${account}:${orderIndex}`);
    }
}
