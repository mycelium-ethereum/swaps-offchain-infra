import { ethers } from "ethers";
import { timeoutPromise } from "./helpers";

export const isWsProvider = (url: string) => {
    const protocol = url.split(":")[0];
    return protocol === "wss" || protocol === "ws";
};

/**
 * Create a websocketProvider or jsonRPCProvider dependent on provider url
 */
export const createProvider = (url: string) => {
    if (isWsProvider(url)) {
        console.log(`Creating websocket provider: ${url}`);
        return new ethers.providers.WebSocketProvider(url);
    }

    console.log(`Creating jsonRPC provider: ${url}`);
    return new ethers.providers.JsonRpcProvider(url);
};

/**
 * Check provider health with a getBlock
 * Times out after 10 seconds since stale websocket connections can hang
 */
export const checkProviderHealth = async (provider: ethers.providers.Provider) => {
    try {
        await timeoutPromise(provider.getBlockNumber(), 10000, "Timed out whilst checking provider health");
        return true;
    } catch (error) {
        return false;
    }
};
