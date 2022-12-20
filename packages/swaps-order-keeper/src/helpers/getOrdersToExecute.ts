import { Vault__factory } from "@mycelium-ethereum/perpetual-swaps-contracts";
import { BigNumber, ethers } from "ethers";
import DecreaseOrder from "../models/DecreaseOrder";
import IncreaseOrder from "../models/IncreaseOrder";
import SwapOrder from "../models/SwapOrder";
import { OrderList } from "../utils/orders";
import { getPrice, getUsdgMinPrice } from "./cachedFetches";

const USDG = process.env.USDG_ADDRESS;
const PRICE_PRECISION = ethers.utils.parseUnits("1", 30);

export const getOrdersToExecute = async (provider: ethers.providers.Provider): Promise<OrderList> => {
    const vault = Vault__factory.connect(process.env.VAULT_ADDRESS, provider);
    const orderList = new OrderList();

    // Increase orders
    const incCursor = IncreaseOrder.find().cursor();
    for (let order = await incCursor.next(); order != null; order = await incCursor.next()) {
        const currentPrice = await getPrice(vault, order.indexToken, order.isLong);
        const triggerPrice = BigNumber.from(order.triggerPrice);

        // Check that price has crossed the trigger price
        if (order.triggerAboveThreshold && currentPrice.lte(triggerPrice)) {
            continue;
        }
        if (!order.triggerAboveThreshold && currentPrice.gte(triggerPrice)) {
            continue;
        }

        orderList.increaseOrders.push(order);
    }

    // Decrease orders
    const decCursor = DecreaseOrder.find().cursor();
    for (let order = await decCursor.next(); order != null; order = await decCursor.next()) {
        const currentPrice = await getPrice(vault, order.indexToken, !order.isLong);
        const triggerPrice = BigNumber.from(order.triggerPrice);

        // Check that price has crossed the trigger price
        if (order.triggerAboveThreshold && currentPrice.lte(triggerPrice)) {
            continue;
        }
        if (!order.triggerAboveThreshold && currentPrice.gte(triggerPrice)) {
            continue;
        }

        orderList.decreaseOrders.push(order);
    }

    // Swap orders
    const swapCursor = SwapOrder.find().cursor();
    for (let order = await swapCursor.next(); order != null; order = await swapCursor.next()) {
        const tokenA = order.path[0];
        const tokenB = order.path.reverse()[0];
        let tokenAPrice: BigNumber;
        let tokenBPrice: BigNumber;

        if (tokenA === USDG) {
            tokenAPrice = await getUsdgMinPrice(vault, order.path[1]);
        } else {
            tokenAPrice = await getPrice(vault, tokenA, false);
        }
        if (tokenB === USDG) {
            tokenBPrice = PRICE_PRECISION;
        } else {
            tokenBPrice = await getPrice(vault, tokenB, true);
        }

        const currentRatio = tokenBPrice.mul(PRICE_PRECISION).div(tokenAPrice);
        const triggerRatio = BigNumber.from(order.triggerRatio);

        if (order.triggerAboveThreshold && currentRatio.gt(triggerRatio)) {
            orderList.swapOrders.push(order);
        }
        if (!order.triggerAboveThreshold && currentRatio.lt(triggerRatio)) {
            orderList.swapOrders.push(order);
        }
    }

    return orderList;
};
