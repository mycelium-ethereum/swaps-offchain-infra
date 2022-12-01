import { KnownToken, LabelledToken } from '@mycelium-ethereum/swaps-keepers';
import { NETWORKS } from './networks';


export const networkTokens: Record<string, LabelledToken[]> = {
  [NETWORKS.ARBITRUM_MAINNET]: [
    {
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      knownToken: KnownToken.ETH
    }, {
      address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      knownToken: KnownToken.BTC
    },
    {
      address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
      knownToken: KnownToken.LINK
    }, {
      address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
      knownToken: KnownToken.UNI
    }, {
      address: '0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7',
      knownToken: KnownToken.FXS
    }, {
      address: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8',
      knownToken: KnownToken.BAL
    }, {
      address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',
      knownToken: KnownToken.CRV
    }
  ],
  [NETWORKS.ARBITRUM_RINKEBY]: [
    {
      address: '0xB47e6A5f8b33b3F17603C83a0535A9dcD7E32681',
      knownToken: KnownToken.ETH
    }, {
      address: '0x5360425C5dd9a3B3a41F619515F9318caA34CfC9',
      knownToken: KnownToken.BTC
    }
  ],
  [NETWORKS.ARBITRUM_GOERLI]: [
    {
      address: '0x08466D6683d2A39E3597500c1F17b792555FCAB9',
      knownToken: KnownToken.ETH
    }, {
      address: '0x4CC823834038c92CFA66C40C7806959529A3D782',
      knownToken: KnownToken.BTC
    },
    {
      address: '0x6E7155bde03E582e9920421Adf14E10C15dBe890',
      knownToken: KnownToken.LINK
    }
  ]
};
