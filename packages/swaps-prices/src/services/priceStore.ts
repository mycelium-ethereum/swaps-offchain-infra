import { KnownToken, ParsedTokenPrice, calcMedian } from "@mycelium-ethereum/swaps-js";
import { ethers } from "ethers";
import { broadcast } from "./swapsSocket";

class PriceStore {
    prices: Partial<Record<KnownToken, Record<string, { price: ethers.BigNumber; updated: number }>>> = {};
    medianPrices: Partial<Record<KnownToken, ethers.BigNumber>> = {};

    public storePrice(key: string, tokenPrice: ParsedTokenPrice) {
        const { knownToken, price } = tokenPrice;
        // dont store false price
        if (!price) {
            console.error(`Price not found for token: ${knownToken}`);
            return;
        }
        if (!this.prices[knownToken]) {
            this.prices[knownToken] = {};
        }
        // set above
        (this.prices[knownToken] as any)[key] = {
            price: price,
            updated: Date.now(),
        };

        this.updateMedianPrice(knownToken);
    }
    public updateMedianPrice(token: KnownToken) {
        const cexPrices = this.prices[token as KnownToken];
        if (!cexPrices) {
            console.error("Cex prices undefined");
            return;
        }
        const prices: ethers.BigNumber[] = Object.values(cexPrices).map((prices) => prices.price);
        const medianPrice = calcMedian(prices);

        const previousMedianPrice = this.medianPrices[token as KnownToken];

        const medianPriceChanged = previousMedianPrice && !previousMedianPrice.eq(medianPrice);
        if (medianPriceChanged || !previousMedianPrice) {
            broadcast({
                t: "update",
                s: token,
                p: medianPrice.toString(),
                l: previousMedianPrice?.toString(),
            });
        }
        this.medianPrices[token as KnownToken] = medianPrice;
    }

    public clear() {
        this.prices = {};
        this.medianPrices = {};
    }
}

const priceStore = new PriceStore();
export default priceStore;
