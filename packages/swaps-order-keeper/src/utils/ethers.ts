import { ethers } from "ethers";

export const checkProviderHealth = async (provider: ethers.providers.Provider) => {
    try {
        await provider.getBlockNumber();
        return true;
    } catch (err) {
        return false;
    }
};
