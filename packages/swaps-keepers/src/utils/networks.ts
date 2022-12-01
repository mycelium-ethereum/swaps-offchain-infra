import { NETWORK } from "../constants"

export const isSupportedNetwork = (network: string): boolean => {
  return Object.values(NETWORK).includes(network as NETWORK);
}
