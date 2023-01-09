import { Counter, Gauge, Registry } from "prom-client";

export const upkeepErrors = new Counter({
    name: "order_keeper_upkeep_errors",
    help: "Order upkeep errors",
    labelNames: ["error"],
});

export const ordersExecuted = new Counter({
    name: "order_keeper_orders_executed",
    help: "Orders executed",
    labelNames: ["type"],
});

export const upkeepCyclesPerformed = new Counter({
    name: "order_keeper_upkeep_cycles_performed",
    help: "Upkeep cycles performed",
});

export const lastSyncedBlock = new Gauge({
    name: "order_keeper_last_synced_block",
    help: "Last synced block",
});

export const orderExecutionError = new Counter({
    name: "order_keeper_order_execution_error",
    help: "Order execution error",
});

export const ethBalance = new Gauge({
    name: "order_keeper_eth_balance",
    help: "ETH balance",
});

export const resetMetrics = () => {
    upkeepErrors.reset();
    ordersExecuted.reset();
    upkeepCyclesPerformed.reset();
    lastSyncedBlock.reset();
    orderExecutionError.reset();

    // set all base metrics to 0
    upkeepErrors.inc(0);
    ordersExecuted.inc(0);
    upkeepCyclesPerformed.inc(0);
    lastSyncedBlock.inc(0);
    orderExecutionError.inc(0);
};

export const registerMetrics = (registry: Registry) => {
    registry.registerMetric(upkeepErrors);
    registry.registerMetric(ordersExecuted);
    registry.registerMetric(upkeepCyclesPerformed);
    registry.registerMetric(lastSyncedBlock);
    registry.registerMetric(orderExecutionError);
    registry.registerMetric(ethBalance);
};
