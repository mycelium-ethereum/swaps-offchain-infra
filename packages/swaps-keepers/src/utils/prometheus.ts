import { Counter, Gauge, Histogram, Registry } from "prom-client";

const swapsInterval = new Counter({
    name: "swaps_interval_check",
    help: "Swaps interval checks",
    labelNames: ["key"],
});

const swapsIntervalError = new Counter({
    name: "swaps_interval_check_error",
    help: "Swaps interval check error",
    labelNames: ["key"],
});

const priceUpdates = new Counter({
    name: "swaps_price_update_success",
    help: "Price update calls",
    labelNames: ["type"],
});

const priceUpdateErrors = new Counter({
    name: "swaps_price_update_errors",
    help: "Price update call failures",
    labelNames: ["error"],
});

const appCrash = new Counter({
    name: "swaps_keeper_failed_unexpectedly",
    help: "Keeper crashed unexpectedly",
    labelNames: ["error"],
});

const checkedPrices = new Counter({
    name: "swaps_price_keeper_poll_count",
    help: "Price keeper poll count",
});

const checkedPositionRequests = new Counter({
    name: "swaps_position_keeper_poll_count",
    help: "Position keeper poll count",
});

const watcherUpdates = new Counter({
    name: "watcher_price_update",
    help: "Watcher checked all prices and found them to be within range",
});

const watcherUpdateAlerts = new Counter({
    name: "watcher_price_alert",
    help: "Watcher has detected a price deviation between median and fast price feed",
    labelNames: ["token"],
});

const watcherUpdateErrors = new Counter({
    name: "watcher_price_error",
    help: "Watcher had an error attempting to validate prices",
    labelNames: ["token"],
});

const priceStored = new Counter({
    name: "price_stored",
    help: "Storing token price",
    labelNames: ["key"],
});

const priceThresholdExceeded = new Counter({
    name: "price_threshold_exceeded",
    help: "Price threshold exceeded",
    labelNames: ["token"],
});

const executionSpeed = new Histogram({
    name: "position_execution_speed",
    help: "Position execution speed",
});

const wsErrors = new Counter({
    name: "websocket_errors",
    help: "Number of websocket errors",
    labelNames: ["key"],
});

const priceFetchErrors = new Counter({
    name: "price_fetch_errors",
    help: "Number of price fetch errors",
    labelNames: ["key"],
});

const ethBalance = new Gauge({
    name: "price_keeper_eth_balance",
    help: "ETH balance of keeper",
});

const registerMetrics = (register: Registry) => {
    register.registerMetric(priceUpdates);
    register.registerMetric(priceUpdateErrors);
    register.registerMetric(appCrash);
    register.registerMetric(checkedPrices);
    register.registerMetric(checkedPositionRequests);
    register.registerMetric(priceStored);
    register.registerMetric(executionSpeed);
    register.registerMetric(wsErrors);
    register.registerMetric(priceFetchErrors);
    register.registerMetric(swapsInterval);
    register.registerMetric(swapsIntervalError);
    register.registerMetric(ethBalance);
    register.registerMetric(priceThresholdExceeded);

    // set metrics counts to 0 by default
    priceUpdates.inc(0);
    priceUpdateErrors.inc(0);
    appCrash.inc(0);
    checkedPrices.inc(0);
    checkedPositionRequests.inc(0);
    wsErrors.inc(0);
    priceFetchErrors.inc(0);

    swapsInterval.inc(0);
    swapsIntervalError.inc(0);

    priceThresholdExceeded.inc(0);
};

export {
    registerMetrics,
    priceUpdates,
    priceUpdateErrors,
    appCrash,
    watcherUpdateAlerts,
    watcherUpdates,
    watcherUpdateErrors,
    checkedPrices,
    checkedPositionRequests,
    priceStored,
    executionSpeed,
    wsErrors,
    priceFetchErrors,
    swapsIntervalError,
    swapsInterval,
    ethBalance,
    priceThresholdExceeded,
};
