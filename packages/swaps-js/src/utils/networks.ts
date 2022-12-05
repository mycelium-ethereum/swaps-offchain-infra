import { NETWORK } from "../constants/networks";

export const isSupportedNetwork = (network: string): boolean => {
    return Object.values(NETWORK).includes(network as NETWORK);
};
