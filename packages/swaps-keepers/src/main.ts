require("dotenv").config();

import client from "prom-client";
import express from "express";
import { ethers } from "ethers";
import PositionKeeper from "./services/positionKeeper";
import PriceKeeper from "./services/priceKeeper";
import PricePoller from "./services/pricePoller";
import PriceFeed, { UpdateResult } from "./services/priceFeed";
import { handleClosedConnection } from "./utils";
import {
    priceUpdates,
    checkedPrices,
    registerMetrics,
    priceFetchErrors,
    swapsIntervalError,
    ethBalance,
    priceThresholdExceeded,
} from "./utils/prometheus";
import priceStore, { subscribeWsFeeds } from "./services/prices";
import { orderEmitter, streamOrders } from "./services/orders";
import {
    FastPriceFeed,
    FastPriceFeed__factory,
    PositionRouter,
    PositionRouter__factory,
    VaultPriceFeed__factory,
} from "@mycelium-ethereum/perpetual-swaps-contracts";
import {
    asyncInterval,
    createProvider,
    isWsProvider,
    checkProviderHealth,
    isSupportedNetwork,
    logger,
} from "@mycelium-ethereum/swaps-js";

if (!process.env.RPC_URL) {
    console.error("Must provide RPC_URL");
    process.exit(0);
}

if (!process.env.SIGNING_PRIVATE_KEY) {
    console.error("Must provide SIGNING_PRIVATE_KEY as an environment variable");
    process.exit(0);
}

if (!process.env.VAULT_PRICE_FEED) {
    console.log("Must provide PRICE_FEED address as an environment variable");
    process.exit(0);
}

if (!process.env.POSITION_ROUTER) {
    console.log("Must provide POSITION_ROUTER address as an environment variable");
    process.exit(0);
}

// PositionKeeper props
const positionRouterAddress = process.env.POSITION_ROUTER as string;
const maxExecutionRetry = process.env.MAX_EXECUTION_RETRY ? Number(process.env.MAX_EXECUTION_RETRY) : 5;
const maxExecutableChunk = process.env.MAX_EXECUTABLE_CHUNK ? Number(process.env.MAX_EXECUTABLE_CHUNK) : 100;
const positionKeeperInterval = process.env.POSITION_KEEPER_INTERVAL_MS
    ? parseInt(process.env.POSITION_KEEPER_INTERVAL_MS)
    : 20000; // default 20 seconds
const pausedPositionKeeper = process.env.POSITION_KEEPER_PAUSED === "true";

// priceKeeper props
const priceKeeperInterval = process.env.PRICE_KEEPER_INTERVAL_MS
    ? parseInt(process.env.PRICE_KEEPER_INTERVAL_MS)
    : 20000; // default 20 seconds
const forceUpdateInterval = process.env.PRICE_KEEPER_FORCE_UPDATE_INTERVAL_SECONDS
    ? parseInt(process.env.PRICE_KEEPER_FORCE_UPDATE_INTERVAL_SECONDS)
    : 60 * 5; // default 5 minutes

const pausedPriceKeeper = process.env.PRICE_KEEPER_PAUSED === "true";

// shared props
const priceFeedAddress = process.env.VAULT_PRICE_FEED as string;
const rpc = process.env.RPC_URL;
const fallbackRPC = process.env.FALLBACK_RPC_URL;

const shadowMode = process.env.SHADOW_MODE === "true";

const logResult = (message: string, result: UpdateResult) => {
    const prices = result.prices.map(({ knownToken, price }) => ({
        knownToken,
        price: price?.toString(),
    }));
    logger.info(message, { ...result, prices });
    priceUpdates.inc({ type: message });
    priceUpdates.inc();
};

const pricePollerError = (error: any, key: string) => {
    logger.error("Price poller error", { key, error: new Error(error) });
    priceFetchErrors.inc({ key });
    priceFetchErrors.inc();
    return [];
};

const logIntervalError = (key: string, error?: any) => {
    logger.error(`${key}-${error}`);
    swapsIntervalError.inc({ key });
    swapsIntervalError.inc();
};

// const logIntervalCheck = (key: string) => {
// swapsInterval.inc({ key })
// swapsInterval.inc()
// }
//

const initNewPositionRouter = (
    priceFeed: PriceFeed,
    fastPriceContract: FastPriceFeed,
    positionKeeper: PositionKeeper,
    provider: ethers.providers.Provider,
    oldProvider?: ethers.providers.Provider
): PositionRouter => {
    if (oldProvider) {
        oldProvider.removeAllListeners();
        orderEmitter.removeAllListeners();
    }
    const positionRouter = PositionRouter__factory.connect(positionRouterAddress, provider);
    // dont start streaming if paused
    if (!pausedPositionKeeper) {
        streamOrders(positionRouter);

        orderEmitter.on("increasePosition", (positionInfo) =>
            positionKeeper.handleIncreasePosition(priceFeed, fastPriceContract, positionRouter, positionInfo)
        );
        orderEmitter.on("decreasePosition", (positionInfo) =>
            positionKeeper.handleDecreasePosition(priceFeed, fastPriceContract, positionRouter, positionInfo)
        );
    } else {
        console.warn("Position keeper paused, not listening to events");
    }
    return positionRouter;
};

const main = async () => {
    const provider = createProvider(rpc);
    const signer = new ethers.Wallet(process.env.SIGNING_PRIVATE_KEY as string, provider);

    const network = (await provider.getNetwork()).chainId;

    if (!network || !isSupportedNetwork(network.toString())) {
        console.error(`Network: ${network} not supported`);
        process.exit(0);
    }

    console.log(`Initiating keepers`, {
        network,
        priceFeed: priceFeedAddress,
        positionRouter: positionRouterAddress,
        rpc,
        fallbackRPC,
    });

    const feedContract = VaultPriceFeed__factory.connect(priceFeedAddress, provider);
    const secondaryPriceFeed = await feedContract.secondaryPriceFeed();
    // This ABI doesn't match the one in the package, it's being upgraded
    let fastPriceContract = FastPriceFeed__factory.connect(secondaryPriceFeed, signer);

    const priceFeed = await PriceFeed.Create({
        priceFeed: priceFeedAddress,
        signer,
        shadowMode,
    });
    const priceKeeper = new PriceKeeper();
    const positionKeeper = new PositionKeeper({
        maxExecutionRetry,
        maxExecutableChunk,
    });
    // position router can change when setting new provider
    let positionRouter = initNewPositionRouter(priceFeed, fastPriceContract, positionKeeper, provider);

    if (isWsProvider(rpc)) {
        handleClosedConnection(provider as ethers.providers.WebSocketProvider, async (newProvider) => {
            logger.info(`Reconnecting websocket provider: ${newProvider.connection.url}`);
            const providerIsHealthy = await checkProviderHealth(newProvider);
            if (providerIsHealthy) {
                // connect new provider
                const newFastPriceContract = fastPriceContract.connect(signer.connect(newProvider));
                fastPriceContract = newFastPriceContract;
                positionRouter = initNewPositionRouter(
                    priceFeed,
                    newFastPriceContract,
                    positionKeeper,
                    newProvider,
                    provider
                );
            } else {
                logger.error(`Failed to reconnect websocket provider. Exiting`);
                process.exit(1);
            }
        });
    }

    if (!pausedPriceKeeper) {
        const pricePoller = new PricePoller({ tokens: priceFeed.tokens ?? [] });
        const [binancePrices, bitFinexPrices, cryptoComPrices /* , ftxPrices */] = await Promise.all([
            pricePoller.fetchBinancePrices().catch((error) => pricePollerError(error, "binance")),
            pricePoller.fetchBitfinexPrices().catch((error) => pricePollerError(error, "bitfinex")),
            // pricePoller.fetchFTXPrices().catch((error) => pricePollerError(error, 'ftx')),
            pricePoller.fetchCryptoComPrices().catch((error) => pricePollerError(error, "cryptoCom")),
        ]);
        priceStore.storePrices("binance", binancePrices, true);
        priceStore.storePrices("bitfinex", bitFinexPrices, true);
        // priceStore.storePrices('ftx', ftxPrices, true)
        priceStore.storePrices("cryptoCom", cryptoComPrices, true);

        // set initial prices
        const initialPrices = await priceFeed.fetchFeedPrices(fastPriceContract);
        const lastUpdatedAt = priceFeed.lastUpdatedAt;
        priceStore.storeFeedPrices(initialPrices, lastUpdatedAt, true);

        // subscribe ws feeds
        const tokens = priceFeed.tokens;
        subscribeWsFeeds(tokens?.map((token) => token.knownToken) ?? []);

        // periodically check lastUpdatedThreshold
        asyncInterval({
            fn: async () => {
                logger.info(`Checking stale prices, will update if prices are older than ${forceUpdateInterval}s`);
                priceKeeper.checkStalePrices(priceFeed, fastPriceContract, forceUpdateInterval);
                checkedPrices.inc();

                logger.info("Updating CEX prices, fetching binance, bitfinex, crypto.com and feedPrices");
                const [binancePrices, bitFinexPrices, cryptoComPrices /*, ftxPrices */, feedPrices] = await Promise.all(
                    [
                        pricePoller.fetchBinancePrices().catch((error) => pricePollerError(error, "binance")),
                        pricePoller.fetchBitfinexPrices().catch((error) => pricePollerError(error, "bitfinex")),
                        // pricePoller.fetchFTXPrices().catch((error) => pricePollerError(error, 'ftx')),
                        pricePoller.fetchCryptoComPrices().catch((error) => pricePollerError(error, "cryptoCom")),
                        priceFeed.fetchFeedPrices(fastPriceContract),
                    ]
                );
                priceStore.storePrices("binance", binancePrices, true);
                priceStore.storePrices("bitfinex", bitFinexPrices, true);
                // priceStore.storePrices('ftx', ftxPrices, true)
                priceStore.storePrices("cryptoCom", cryptoComPrices, true);

                // update store prices triggers a price comparison
                priceStore.storeFeedPrices(feedPrices);
                logger.info(`Finished checking and updating prices, sleeping for ${priceKeeperInterval}s`);
            },
            delayMs: priceKeeperInterval,
            onError: (error) => {
                logIntervalError("Failed checking stale prices", error);
            },
            onUnavailable: () => {
                logIntervalError("Tried checking stale prices but interval mutex unavailable");
            },
        });

        // trigger price update if stale
        priceKeeper.on("force_update", ({ lastUpdatedAt, now }) => {
            logger.info(`Prices are older than ${forceUpdateInterval}, forcing update`, {
                lastUpdatedAt,
                now,
                forceUpdateInterval,
            });
            const medianPrices = priceStore.getMedianPrices();
            priceKeeper.updatePrices(priceFeed, fastPriceContract, medianPrices);
        });

        priceStore.on("exceeded", async (e) => {
            // prevent spam if is already updating
            if (!priceKeeper.isUpdating) {
                logger.info("Price threshold exceeded", e);
                priceThresholdExceeded.inc({ token: e.knownToken });
                priceThresholdExceeded.inc();
                const medianPrices = priceStore.getMedianPrices();
                priceKeeper.updatePrices(priceFeed, fastPriceContract, medianPrices);
            }
        });

        priceKeeper.on("executed", (result) => {
            logResult("Prices udpated without position execution", result);

            const { prices, lastUpdatedAt } = result;
            priceStore.storeFeedPrices(prices, lastUpdatedAt);
        });
    } else {
        console.log("Price Keeper paused");
    }

    if (!pausedPositionKeeper) {
        // periodically check and execute outstanding orders
        asyncInterval({
            fn: async () => {
                logger.info(
                    "Checking outstanding orders, execution will trigger if startIndex(Increase/Decrease)Position != endIndex(Increase/Decrease)Position"
                );
                await positionKeeper.executeOutstandingOrders(priceFeed, fastPriceContract, positionRouter);
                logger.info(`Finished checking outstanding orders, sleeping for ${positionKeeperInterval}ms`);
            },
            delayMs: positionKeeperInterval,
            runImmediately: true,
            onError: (error) => {
                logIntervalError("Failed checking outstanding orders", error);
            },
            onUnavailable: () => {
                logIntervalError("Tried checking outstanding orders but interval mutex unavailable");
            },
        });

        positionKeeper.on("executed", (result) => {
            logResult("Positions executed", result);
            const { prices, lastUpdatedAt } = result;
            priceStore.storeFeedPrices(prices, lastUpdatedAt);
        });
    } else {
        console.log("Position Keeper Paused");
    }

    asyncInterval({
        fn: async () => {
            const balanceWei = await signer.getBalance();
            const balanceEth = ethers.utils.formatEther(balanceWei);
            ethBalance.set(parseFloat(balanceEth));
        },
        delayMs: 60000, // 1 minute
        runImmediately: true,
    });
};

const app = express();

// Create a Registry to register the metrics
const register = new client.Registry();
registerMetrics(register);

// @ts-ignore
app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", register.contentType);
    res.send(await register.metrics());
});

app.listen(9111, () => {
    console.log("Server is running on http://localhost:9111");
    main();
});
