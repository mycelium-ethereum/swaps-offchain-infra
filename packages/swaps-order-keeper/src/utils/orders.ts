import { DecreaseOrderAttrs } from "../models/DecreaseOrder";
import { IncreaseOrderAttrs } from "../models/IncreaseOrder";
import { SwapOrderAttrs } from "../models/SwapOrder";

export class OrderList {
    swapOrders: SwapOrderAttrs[];
    increaseOrders: IncreaseOrderAttrs[];
    decreaseOrders: DecreaseOrderAttrs[];

    constructor() {
        this.swapOrders = [];
        this.increaseOrders = [];
        this.decreaseOrders = [];
    }

    total(): number {
        return this.increaseOrders.length + this.decreaseOrders.length + this.swapOrders.length;
    }
}
