import { ethers } from "ethers";
import {
    KnownTokenMap,
    NETWORK,
    PriceFeedToken,
    delay,
    attemptPromiseRecursively,
    timeoutError,
    isSupportedNetwork,
    ParsedTokenPrice,
    PRICE_PRECISION,
    logger,
    getPriceBits,
    orderPrices,
} from "@mycelium-ethereum/swaps-js";
import {
    FastPriceFeed,
    FastPriceFeed__factory,
    VaultPriceFeed__factory,
} from "@mycelium-ethereum/perpetual-swaps-contracts";
import { priceUpdateErrors } from "../utils/prometheus";
import { callContract, fallbackProvider } from "../utils/providers";

interface IPriceFeed {
    priceFeed: string;
    signer: ethers.Wallet;
    shadowMode?: boolean;
}

export type UpdateResult = {
    txnHash: string;
    prices: ParsedTokenPrice[];
    lastUpdatedAt: number;
    timestamp: number;
};

const logError = (label: string, error: any) => {
    logger.error(label, { error });
    priceUpdateErrors.inc({ error: label });
    priceUpdateErrors.inc();
};

export default class PriceFeed {
    signer: ethers.Wallet | undefined;

    tokens: PriceFeedToken[];
    lastUpdatedAt: number;
    shadowMode = false;

    private constructor() {
        this.tokens = [];
        this.lastUpdatedAt = 0;
    }

    public static async Create(props: IPriceFeed): Promise<PriceFeed> {
        const priceKeeper = new PriceFeed();
        await priceKeeper.init(props);
        return priceKeeper;
    }

    public async init(props: IPriceFeed): Promise<void> {
        const { priceFeed, signer, shadowMode } = props;
        this.signer = signer;

        this.shadowMode = !!shadowMode;

        const network = (await signer.getChainId()).toString();
        if (!isSupportedNetwork(network)) {
            throw Error(`Unsupported network: ${network}`);
        }

        const feedContract = VaultPriceFeed__factory.connect(priceFeed, signer);
        const secondaryPriceFeed = await feedContract.secondaryPriceFeed();
        const fastPriceContract = FastPriceFeed__factory.connect(secondaryPriceFeed, signer);

        this.updateLastUpdatedAt(fastPriceContract);

        // the max the contracts check is 8
        const numTokens = Object.keys(KnownTokenMap[network as NETWORK]).length;
        const indexes = [...Array(numTokens).keys()];
        const tokens = await Promise.all(indexes.map((i) => fastPriceContract.tokens(i)));
        const tokenPrecisions = await Promise.all(indexes.map((i) => fastPriceContract.tokenPrecisions(i)));
        const priceFeedTokens = indexes.map((i) => {
            if (!KnownTokenMap[network as NETWORK]?.[tokens[i]]) {
                throw Error(`Unknown token ${tokens[i]}`);
            }
            return {
                address: tokens[i],
                precision: tokenPrecisions[i].toNumber(),
                knownToken: KnownTokenMap[network as NETWORK][tokens[i]],
            } as PriceFeedToken;
        });
        logger.info("Initiated PriceFeed", {
            tokens: priceFeedTokens,
            network,
        });
        // order is preserved
        this.tokens = priceFeedTokens;
    }

    /**
     * Set FastPriceFeed prices in bits
     * @returns the txn hash of the update
     */
    public async updatePricesWithBits(
        fastPriceContract: FastPriceFeed,
        prices: ParsedTokenPrice[]
    ): Promise<UpdateResult | undefined> {
        return this.updatePrices(fastPriceContract, "setPricesWithBits", prices);
    }

    /**
     * Set FastPriceFeed prices in bits
     * @returns the txn hash of the update
     */
    public async updatePricesWithBitsAndExecute(
        fastPriceContract: FastPriceFeed,
        prices: ParsedTokenPrice[],
        increaseIndex: number,
        decreaseIndex: number
    ): Promise<UpdateResult | undefined> {
        return this.updatePrices(fastPriceContract, "setPricesWithBitsAndExecute", prices, [
            increaseIndex,
            decreaseIndex,
        ]);
    }

    private async updatePrices(
        fastPriceContract: FastPriceFeed,
        fn: "setPricesWithBits" | "setPricesWithBitsAndExecute",
        prices: ParsedTokenPrice[],
        extraArgs: any[] = []
    ): Promise<UpdateResult | undefined> {
        // format prices with their respective precision
        const { priceInBits, timestamp } = this.prepareUpdateArgs(prices);

        logger.info(`Attempting to ${fn}`, {
            priceInBits,
            prices: prices.map(({ knownToken, price }) => ({
                knownToken,
                price: price.toString(),
            })),
            timestamp,
            ...extraArgs,
        });

        try {
            if (!this.shadowMode) {
                let txnReceipt = await this._attemptToExecute(
                    fastPriceContract,
                    fn,
                    priceInBits,
                    timestamp,
                    extraArgs,
                    false
                );
                if (!txnReceipt) {
                    logger.warn(`Attempting to ${fn} with fallback provider`);
                    const fallbackFastFeed = this.connectSecondaryProvider(fastPriceContract);
                    if (fallbackFastFeed) {
                        // attempt to execute with secondary provider
                        txnReceipt = await this._attemptToExecute(
                            fallbackFastFeed,
                            fn,
                            priceInBits,
                            timestamp,
                            extraArgs,
                            true
                        );
                    }
                }
                if (txnReceipt) {
                    const lastUpdatedAt = await this.updateLastUpdatedAt(fastPriceContract);
                    return {
                        txnHash: txnReceipt.transactionHash,
                        prices,
                        timestamp,
                        lastUpdatedAt,
                    };
                }
            } else {
                // wait 10 seconds to simulate price update
                logger.info(`Keeper in shadow mode: sleeping for 10 seconds to simulate order execution`);
                await delay(10 * 1000);
            }
        } catch (error) {
            logger.error(`${fn} failed unpredictably`, error);
            priceUpdateErrors.inc({ error: `${fn} failed` });
            priceUpdateErrors.inc();
        }
    }

    /**
     * Attempts to execute
     */
    private async _attemptToExecute(
        fastPriceContract: FastPriceFeed,
        fn: "setPricesWithBits" | "setPricesWithBitsAndExecute",
        priceInBits: string,
        timestamp: number,
        extraArgs: any[] = [],
        usingFallback: boolean
    ): Promise<ethers.providers.TransactionReceipt | undefined> {
        const usingProvider = `using ${usingFallback ? "fallback" : "primary"} provider`;

        const txnReceipt = await attemptPromiseRecursively<ethers.providers.TransactionReceipt | undefined>({
            promise: async () => {
                const txn = await fastPriceContract[fn](
                    priceInBits,
                    timestamp,
                    // @ts-ignore
                    ...extraArgs
                );
                const txnHash = txn?.hash;
                logger.info(`Pending ${fn} ${usingProvider}`, { txnHash });
                const txnReceipt = await txn.wait();
                return txnReceipt;
            },
            retryCheck: async (error) => {
                logError(`Failed executing ${fn} during retry ${usingProvider}`, error);
                // dont bother retrying after a timeout
                if (error === timeoutError) {
                    return false;
                }
                return true;
            },
            timeoutMessage: `Timed out whilst executing ${fn} ${usingProvider}`,
        }).catch((error) => {
            logError(`Failed executing ${fn} ${usingProvider}. Will not retry`, error);
            return undefined;
        });

        return txnReceipt;
    }

    /**
     * Prepare prices setPricesWithBits
     * @params a list of median token prices
     * @returns an object containing
     *  priceInbits - string representation of bits
     *  timestamp - the current timestamp
     */
    public prepareUpdateArgs(prices: ParsedTokenPrice[]): {
        priceInBits: string;
        timestamp: number;
    } {
        if (this.tokens.length !== prices.length) {
            throw Error("Missing entry in prices array");
        }
        const orderedPrices = orderPrices(this.tokens, prices).map((t) => t.price);
        const parsedPrices = orderedPrices.map((price, i) => {
            const parsedPrice = price.mul(this.tokens[i].precision).div(ethers.utils.parseEther("1"));
            if (parsedPrice.eq(0)) {
                throw Error(`Cannot set zero price bit: ${this.tokens[i].knownToken}`);
            }
            return parsedPrice;
        });

        return {
            priceInBits: getPriceBits(parsedPrices),
            timestamp: Math.floor(Date.now() / 1000),
        };
    }

    /**
     * Fetches the existing prices on the FastPriceFeed
     * @returns an array of BigNumber prices
     */
    public async fetchFeedPrices(fastPriceContract: FastPriceFeed): Promise<ParsedTokenPrice[]> {
        const primaryPrices: ethers.BigNumber[] = (await Promise.all(
            this.tokens.map(async (token) =>
                callContract(
                    fastPriceContract,
                    "prices",
                    [token.address],
                    `fastPriceContract.prices(${token.address}:${token.knownToken})`
                )
            )
        )) as ethers.BigNumber[];

        return primaryPrices.map((price, i) => ({
            knownToken: this.tokens[i].knownToken,
            price: price.mul(ethers.utils.parseEther("1")).div(PRICE_PRECISION),
        }));
    }

    public async updateLastUpdatedAt(fastPriceContract: FastPriceFeed): Promise<number> {
        const lastUpdatedAt = await callContract(fastPriceContract, "lastUpdatedAt", [], "fastPriceFeed.lastUpdatedAt");
        this.lastUpdatedAt = (lastUpdatedAt as ethers.BigNumber).toNumber();
        return this.lastUpdatedAt;
    }

    public connectSecondaryProvider(contract: FastPriceFeed): FastPriceFeed | undefined {
        if (this.signer && fallbackProvider) {
            return contract.connect(this.signer.connect(fallbackProvider));
        } else {
            logger.warn("Tried connecting secondary provider but no fallback provider set");
            return;
        }
    }
}
