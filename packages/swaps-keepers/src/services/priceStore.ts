require("dotenv").config();

import { ethers } from "ethers";
import { TypedEmitter } from "tiny-typed-emitter";
import { KnownToken, calcMedian, ParsedTokenPrice, logger } from "@mycelium-ethereum/swaps-js";
import { priceStored } from "../utils/prometheus";

interface PriceEvents {
    exceeded: ({
        knownToken,
        feedPrice,
        medianPrice,
    }: {
        knownToken: KnownToken;
        medianPrice: string;
        feedPrice: string;
    }) => void;
}

const DEFAULT_PRICE_THRESHOLD = process.env.PRICE_THRESHOLD
    ? ethers.utils.parseEther(process.env.PRICE_THRESHOLD)
    : ethers.utils.parseEther("0.0012");

const assetThresholds: Record<KnownToken, ethers.BigNumber> = {
    [KnownToken.ETH]: DEFAULT_PRICE_THRESHOLD,
    [KnownToken.BTC]: DEFAULT_PRICE_THRESHOLD,
    [KnownToken.LINK]: ethers.utils.parseEther("0.003"),
    [KnownToken.UNI]: ethers.utils.parseEther("0.003"),
    [KnownToken.FXS]: ethers.utils.parseEther("0.005"),
    [KnownToken.BAL]: ethers.utils.parseEther("0.005"),
    [KnownToken.CRV]: ethers.utils.parseEther("0.005"),
};

export class PriceStore extends TypedEmitter<PriceEvents> {
    prices: Partial<Record<KnownToken, any>> = {};
    lastUpdatedAt = 0;

    storePrice(key: string, tokenPrice: ParsedTokenPrice, noCompare?: boolean) {
        const { knownToken, price } = tokenPrice;
        // dont store false price
        if (!price) {
            logger.warn(`Tried storing ${key} price`, {
                knownToken,
                price,
                key,
            });
            return;
        }
        if (!this.prices[knownToken]) {
            this.prices[knownToken] = {};
        }
        logger.debug("Storing price", { key, knownToken, price });
        this.prices[knownToken][key] = price;
        priceStored.inc({ key });

        if (!noCompare) {
            this.priceCompare(knownToken);
        }
    }

    storePrices(key: string, prices: ParsedTokenPrice[], noCompare?: boolean) {
        logger.info(`Storing ${key} prices`, {
            key,
            prices: prices.map(({ knownToken, price }) => ({
                knownToken,
                price: price ? ethers.utils.formatEther(price) : undefined,
            })),
        });
        prices.forEach((price) => this.storePrice(key, price, noCompare));
    }

    storeFeedPrices(prices: ParsedTokenPrice[], lastUpdatedAt?: number, noCompare?: boolean) {
        this.storePrices("feed", prices, noCompare);
        if (lastUpdatedAt) {
            this.lastUpdatedAt = lastUpdatedAt;
        }
    }

    priceCompare(knownToken: KnownToken): void {
        const prices = this.prices[knownToken];
        if (!prices) {
            logger.error(`No known prices for token: ${knownToken}`);
            return;
        }

        const { feedPrice, medianPrice } = this.getComparablePrices(knownToken);

        const diff = feedPrice.sub(medianPrice).mul(ethers.utils.parseEther("1")).div(medianPrice);

        const threshold = assetThresholds[knownToken] ?? DEFAULT_PRICE_THRESHOLD;
        if (diff.abs().gt(threshold)) {
            this.emit("exceeded", {
                knownToken,
                feedPrice: feedPrice.toString(),
                medianPrice: medianPrice.toString(),
            });
        }
    }

    getComparablePrices(knownToken: KnownToken): {
        feedPrice: ethers.BigNumber;
        medianPrice: ethers.BigNumber;
    } {
        const { feed, ...cexPrices } = this.prices[knownToken];
        let feedPrice = feed;
        const medianPrice = calcMedian(Object.values(cexPrices));

        if (!feedPrice) {
            this.prices[knownToken].feed = medianPrice;
            feedPrice = medianPrice;
        }
        return {
            feedPrice,
            medianPrice,
        };
    }

    getMedianPrices(): ParsedTokenPrice[] {
        const knownTokens = Object.keys(this.prices);
        return knownTokens.map((token) => ({
            knownToken: token as KnownToken,
            price: this.getComparablePrices(token as KnownToken).medianPrice,
        }));
    }
}
