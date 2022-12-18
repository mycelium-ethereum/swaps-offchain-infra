import { Vault__factory, PositionManager__factory } from "@mycelium-ethereum/perpetual-swaps-contracts";
import { BigNumber, ethers } from "ethers";
import DecreaseOrder from "../models/DecreaseOrder";
import IncreaseOrder from "../models/IncreaseOrder";
import SwapOrder from "../models/SwapOrder";
import { OrderList } from "../utils/orders";
import {
    getGlobalShortSize,
    getGuaranteedUsd,
    getMaxGlobalLongSize,
    getMaxGlobalShortSize,
    getPrice,
    getUsdgMinPrice,
} from "./cachedFetches";

const USDG = process.env.USDG_ADDRESS;
const PRICE_PRECISION = ethers.utils.parseUnits("1", 30);

export const getOrdersToExecute = async (provider: ethers.providers.Provider): Promise<OrderList> => {
    const vault = Vault__factory.connect(process.env.VAULT_ADDRESS, provider);
    const positionManager = PositionManager__factory.connect(process.env.POSITION_MANAGER_ADDRESS, provider);
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

        // Check that the vault has enough liquidity
        if (order.isLong) {
            const maxGlobalLongSize = await getMaxGlobalLongSize(positionManager, order.indexToken);
            const guaranteedUsd = await getGuaranteedUsd(vault, order.indexToken);
            if (maxGlobalLongSize.gt(0) && guaranteedUsd.add(order.sizeDelta).gt(maxGlobalLongSize)) {
                continue;
            }
        } else {
            const maxGlobalShortSize = await getMaxGlobalShortSize(positionManager, order.indexToken);
            const globalShortSize = await getGlobalShortSize(vault, order.indexToken);
            if (maxGlobalShortSize.gt(0) && globalShortSize.add(order.sizeDelta).gt(maxGlobalShortSize)) {
                continue;
            }
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

        // Check that the position & collateral is large enough
        const [size, collateral] = await vault.getPosition(
            order.account,
            order.collateralToken,
            order.indexToken,
            order.isLong
        );
        if (size.lt(order.sizeDelta)) {
            continue;
        }
        if (collateral.lt(order.collateralDelta)) {
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
