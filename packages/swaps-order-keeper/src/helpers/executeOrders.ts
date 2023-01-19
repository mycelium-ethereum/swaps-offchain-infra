import { PositionManager__factory } from "@mycelium-ethereum/perpetual-swaps-contracts";
import { ethers } from "ethers";
import { OrderList } from "../utils/orders";
import colors from "colors";
import { orderExecutionError, ordersExecuted } from "../prometheus";
import DecreaseOrderService from "../services/decreaseOrderService";
import IncreaseOrderService from "../services/increaseOrderService";
import SwapOrderService from "../services/swapOrderService";

const ORDERS_PER_TRANSACTION = 30;
const decreaseOrderService = new DecreaseOrderService();
const increaseOrderService = new IncreaseOrderService();
const swapOrderService = new SwapOrderService();

export async function executeOrders(orders: OrderList, signer: ethers.Signer) {
    while (orders.total() > 0) {
        const batch = new OrderList();
        while (batch.total() < ORDERS_PER_TRANSACTION && orders.total() > 0) {
            if (orders.increaseOrders.length) {
                batch.increaseOrders.push(orders.increaseOrders.pop());
            } else if (orders.decreaseOrders.length) {
                batch.decreaseOrders.push(orders.decreaseOrders.pop());
            } else if (orders.swapOrders.length) {
                batch.swapOrders.push(orders.swapOrders.pop());
            } else {
                break;
            }
        }
        await executeOrderBatch(batch, signer);
    }
    console.log(colors.cyan(`All orders executed!`));
}

async function executeOrderBatch(orders: OrderList, signer: ethers.Signer) {
    if (orders.total() > ORDERS_PER_TRANSACTION) {
        throw new Error(`Cannot execute more than ${ORDERS_PER_TRANSACTION} orders per transaction`);
    }

    const positionManager = PositionManager__factory.connect(process.env.POSITION_MANAGER_ADDRESS, signer);
    const feeReceiver = process.env.FEE_RECEIVER_ADDRESS;

    const incAccounts: string[] = [];
    const incOrderIndices: number[] = [];
    await Promise.all(
        orders.increaseOrders.map(async (order) => {
            try {
                await positionManager.estimateGas.executeIncreaseOrder(order.account, order.orderIndex, feeReceiver);
                incAccounts.push(order.account);
                incOrderIndices.push(order.orderIndex);
            } catch (err) {
                // The order will not execute, don't include it in the batch
                const revertReason = extractRevertReason(err);
                console.log(
                    `Skipping IncreaseOrder #${order.orderIndex} for ${order.account} due to the following error: "${revertReason}"`
                );
            }
        })
    );

    const decAccounts: string[] = [];
    const decOrderIndices: number[] = [];
    await Promise.all(
        orders.decreaseOrders.map(async (order) => {
            try {
                await positionManager.estimateGas.executeDecreaseOrder(order.account, order.orderIndex, feeReceiver);
                decAccounts.push(order.account);
                decOrderIndices.push(order.orderIndex);
            } catch (err) {
                // The order will not execute, don't include it in the batch
                const revertReason = extractRevertReason(err);
                console.log(
                    `Skipping DecreaseOrder #${order.orderIndex} for ${order.account} due to the following error: "${revertReason}"`
                );
            }
        })
    );

    const swapAccounts: string[] = [];
    const swapOrderIndices: number[] = [];
    await Promise.all(
        orders.swapOrders.map(async (order) => {
            try {
                await positionManager.estimateGas.executeSwapOrder(order.account, order.orderIndex, feeReceiver);
                swapAccounts.push(order.account);
                swapOrderIndices.push(order.orderIndex);
            } catch (err) {
                // The order will not execute, don't include it in the batch
                const revertReason = extractRevertReason(err);
                console.log(
                    `Skipping SwapOrder #${order.orderIndex} for ${order.account} due to the following error: "${revertReason}"`
                );
            }
        })
    );

    const validOrdersToExecute = incAccounts.length + decAccounts.length + swapAccounts.length;

    // The last order is sometimes not executed, so we add a dummy order
    if (incAccounts.length) {
        incAccounts.push(ethers.constants.AddressZero);
        incOrderIndices.push(0);
    }
    if (decAccounts.length) {
        decAccounts.push(ethers.constants.AddressZero);
        decOrderIndices.push(0);
    }
    if (swapAccounts.length) {
        swapAccounts.push(ethers.constants.AddressZero);
        swapOrderIndices.push(0);
    }

    if (validOrdersToExecute !== 0) {
        const tx = await positionManager.executeMany(
            incAccounts,
            incOrderIndices,
            decAccounts,
            decOrderIndices,
            swapAccounts,
            swapOrderIndices,
            feeReceiver
        );

        const receipt = await tx.wait();
        const errorEvents =
            receipt.events?.filter((ev) => {
                return (
                    ["ExecuteIncreaseOrderError", "ExecuteDecreaseOrderError", "ExecuteSwapOrderError"].includes(
                        ev.event
                    ) && ev.args.account !== ethers.constants.AddressZero
                );
            }) || [];

        const numExecuted = orders.total() - errorEvents.length;
        ordersExecuted.inc(numExecuted);

        console.log(colors.cyan(`Transaction executed! Hash: ${tx.hash}`));
        console.log(`Number of orders executed: ${numExecuted}`);
        logOrderErrors(errorEvents);
        for (const ev of errorEvents) {
            if (isInvalidPrice(ev)) {
                // Nothing to do, price changed since we last checked
                continue;
            } else if (shouldBeDeleted(ev)) {
                if (ev.event === "ExecuteDecreaseOrderError") {
                    await decreaseOrderService.delete(ev.args.account, ev.args.orderIndex);
                } else if (ev.event === "ExecuteIncreaseOrderError") {
                    await increaseOrderService.delete(ev.args.account, ev.args.orderIndex);
                } else if (ev.event === "ExecuteSwapOrderError") {
                    await swapOrderService.delete(ev.args.account, ev.args.orderIndex);
                }
            } else {
                orderExecutionError.inc();
            }
        }
    }
}

function logOrderErrors(errorEvents: ethers.Event[]) {
    if (errorEvents.length) {
        console.log(colors.red(`Errors executing orders:`));
        errorEvents.forEach((ev) => {
            console.log({
                type: ev.event,
                account: ev.args.account,
                orderIndex: ev.args.orderIndex.toString(),
                reason: ev.args.reason,
            });
        });
    }
}

function isInvalidPrice(ev: ethers.Event): boolean {
    return ev.args.reason === "OrderBook: invalid price for execution";
}

function shouldBeDeleted(ev: ethers.Event): boolean {
    if (ev.args.reason === "OrderBook: non-existent order") {
        return true;
    }
    return false;
}

function extractRevertReason(err: Error): string {
    const reasonStr = err.message.match(/reason="[^"]*"/);
    if (reasonStr) {
        return reasonStr[0].replace("reason=", "").replace(/"/g, "");
    }
    return "";
}
