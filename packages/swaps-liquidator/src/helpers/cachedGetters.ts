import { Vault } from "@mycelium-ethereum/perpetual-swaps-contracts";
import { BigNumber } from "ethers";
import Cache from "node-cache";

const INTERVAL = process.env.INTERVAL_MS ? parseInt(process.env.INTERVAL_MS) : 60000;
const cache = new Cache({ stdTTL: INTERVAL / 1000 });
const ONE_DAY = 60 * 60 * 24;

export const getTokenPrice = async (address: string, isLong: boolean, vault: Vault): Promise<BigNumber> => {
    const key = `getPrice-${address}-${isLong}`;
    const cachedPrice = cache.get(key);
    if (cachedPrice) {
        return cachedPrice as Promise<BigNumber>;
    } else {
        console.log("Fetching new value for " + key);
        const promise = isLong ? vault.getMinPrice(address) : vault.getMaxPrice(address);
        cache.set(key, promise);
        return promise;
    }
};

export const getCumulativeFundingRate = async (token: string, vault: Vault): Promise<BigNumber> => {
    const key = `getCumulativeFundingRate-${token}`;
    const cachedValue = cache.get(key);
    if (cachedValue) {
        return cachedValue as Promise<BigNumber>;
    } else {
        console.log("Fetching new value for " + key);
        const promise = vault.cumulativeFundingRates(token);
        cache.set(key, promise);
        return promise;
    }
};

export const getLiquidationFee = async (vault: Vault): Promise<BigNumber> => {
    const key = `getLiquidationFee`;
    const cachedValue = cache.get(key);
    if (cachedValue) {
        return cachedValue as Promise<BigNumber>;
    } else {
        console.log("Fetching new value for " + key);
        const promise = vault.liquidationFeeUsd();
        cache.set(key, promise, ONE_DAY);
        return promise;
    }
};

export const getMarginFeeBps = async (vault: Vault): Promise<BigNumber> => {
    const key = `getMarginFeeBps`;
    const cachedValue = cache.get(key);
    if (cachedValue) {
        return cachedValue as Promise<BigNumber>;
    } else {
        console.log("Fetching new value for " + key);
        const promise = vault.marginFeeBasisPoints();
        cache.set(key, promise, ONE_DAY);
        return promise;
    }
};
