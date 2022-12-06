import { logger } from "ethers";
import { TypedEmitter } from "tiny-typed-emitter";
import { ParsedTokenPrice } from "@mycelium-ethereum/swaps-js";
import { FastPriceFeed } from "@mycelium-ethereum/perpetual-swaps-contracts";
import PriceFeed, { UpdateResult } from "./priceFeed";

interface PriceKeeperEvents {
    executed: (e: UpdateResult) => void;
    force_update: ({ lastUpdatedAt, now }: { lastUpdatedAt: number; now: number }) => void;
}

export default class PriceKeeper extends TypedEmitter<PriceKeeperEvents> {
    isUpdating = false;

    async updatePrices(
        priceFeed: PriceFeed,
        fastFeedContract: FastPriceFeed,
        medianPrices: ParsedTokenPrice[]
    ): Promise<void> {
        this.isUpdating = true;
        const result = await priceFeed.updatePricesWithBits(fastFeedContract, medianPrices);
        if (result) {
            this.emit("executed", result);
        }
        this.isUpdating = false;
    }

    async checkStalePrices(priceFeed: PriceFeed, fastFeedContract: FastPriceFeed, forceUpdateInterval: number) {
        const lastUpdatedAt = (await priceFeed.updateLastUpdatedAt(fastFeedContract)) ?? 0;
        const now = Math.floor(Date.now() / 1000);
        const priceAge = now - lastUpdatedAt;
        logger.info(`Prices are ${priceAge}s old, last updated at ${lastUpdatedAt}`);
        if (lastUpdatedAt !== 0 && priceAge > forceUpdateInterval) {
            this.emit("force_update", { lastUpdatedAt, now });
        }
    }
}
