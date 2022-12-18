import { OrderBook__factory } from "@mycelium-ethereum/perpetual-swaps-contracts";
import DecreaseOrderService from "../services/decreaseOrderService";
import SwapOrderService from "../services/swapOrderService";
import IncreaseOrderService from "../services/increaseOrderService";
import ParameterService from "../services/parameterService";
import { ethers } from "ethers";
import { lastSyncedBlock as lastSyncedBlockMetric } from "../prometheus";

export const syncOrderBook = async (provider: ethers.providers.Provider) => {
    const orderBook = OrderBook__factory.connect(process.env.ORDER_BOOK_ADDRESS, provider);
    const parameterService = new ParameterService();
    const increaseOrderService = new IncreaseOrderService();
    const decreaseOrderService = new DecreaseOrderService();
    const swapOrderService = new SwapOrderService();

    let startBlock = process.env.START_BLOCK ? Number(process.env.START_BLOCK) : 0;
    const lastSyncedBlock = await parameterService.getParameter("lastSyncedBlock");
    if (lastSyncedBlock) {
        startBlock = Number(lastSyncedBlock.value) + 1;
    }

    const latestBlock = await provider.getBlockNumber();
    let cursor = startBlock;
    while (cursor < latestBlock) {
        const from = cursor;
        const to = Math.min(cursor + 2000, latestBlock); // 2000 is the max number of blocks that can be fetched at once

        console.log(`Fetching logs from block ${from} to ${to}`);

        const logs = await provider.getLogs({
            address: orderBook.address,
            fromBlock: from,
            toBlock: to,
        });
        console.log(`Found ${logs.length} logs`);

        for (const log of logs) {
            const event = orderBook.interface.parseLog(log);
            switch (event.name) {
                case "CreateIncreaseOrder":
                    await increaseOrderService.createFromEvent(event);
                    break;
                case "UpdateIncreaseOrder":
                    await increaseOrderService.updateFromEvent(event);
                    break;
                case "CancelIncreaseOrder":
                    await increaseOrderService.delete(event.args.account, event.args.orderIndex);
                    break;
                case "ExecuteIncreaseOrder":
                    await increaseOrderService.delete(event.args.account, event.args.orderIndex);
                    break;
                case "CreateDecreaseOrder":
                    await decreaseOrderService.createFromEvent(event);
                    break;
                case "UpdateDecreaseOrder":
                    await decreaseOrderService.updateFromEvent(event);
                    break;
                case "CancelDecreaseOrder":
                    await decreaseOrderService.delete(event.args.account, event.args.orderIndex);
                    break;
                case "ExecuteDecreaseOrder":
                    await decreaseOrderService.delete(event.args.account, event.args.orderIndex);
                    break;
                case "CreateSwapOrder":
                    await swapOrderService.createFromEvent(event);
                    break;
                case "UpdateSwapOrder":
                    await swapOrderService.updateFromEvent(event);
                    break;
                case "CancelSwapOrder":
                    await swapOrderService.delete(event.args.account, event.args.orderIndex);
                    break;
                case "ExecuteSwapOrder":
                    await swapOrderService.delete(event.args.account, event.args.orderIndex);
                    break;
            }
        }

        await parameterService.setParameter("lastSyncedBlock", to.toString());
        lastSyncedBlockMetric.set(to);
        cursor = to + 1;
    }
};
