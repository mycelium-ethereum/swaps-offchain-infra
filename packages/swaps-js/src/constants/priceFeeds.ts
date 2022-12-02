import { KnownToken, CoinbaseWsTopic } from '../types';

// https://github.com/gmx-io/gmx-contracts/blob/master/contracts/oracle/FastPriceFeed.sol#L296
export const MAX_PRICE_FEED_TOKENS_LENGTH = 8;

// all tickers https://api.binance.com/api/v3/ticker/price
export const BASE_BINANCE_URL = 'https://api.binance.com/api/v3';
// NOTE: Binance is the only api that returns an error if the symbol does not exist
export const knownTokenToBinanceSymbols: Record<KnownToken, string> = {
  [KnownToken.ETH]: 'ETHUSDT',
  [KnownToken.BTC]: 'BTCUSDT',
  // [KnownToken.BTC]: 'WBTCBUSD',
  [KnownToken.LINK]: 'LINKUSDT',
  [KnownToken.UNI]: 'UNIUSDT',
  [KnownToken.CRV]: 'CRVUSDT',
  [KnownToken.FXS]: 'FXSUSDT',
  [KnownToken.BAL]: 'BALUSDT',
};
export const binanceSymbolToKnownToken: Record<string, KnownToken> = Object.keys(knownTokenToBinanceSymbols).reduce((o, k) => ({ ...o, [knownTokenToBinanceSymbols[k as KnownToken] as string]: k }), {});

export const createBinanceWsFeeds = (tokens: KnownToken[]) => tokens.length > 0 ? [{
  params: tokens.map((symbol) => `${knownTokenToBinanceSymbols[symbol].toLowerCase()}@ticker`),
  id: 1
}] : []

// all tickers https://api-pub.bitfinex.com/v2/conf/pub:list:pair:exchange
export const knownTokenToBitfinexSymbols: Partial<Record<KnownToken, string>> = {
  [KnownToken.ETH]: 'tETHUSD',
  [KnownToken.BTC]: 'tBTCUSD',
  [KnownToken.LINK]: 'tLINK:USD',
  [KnownToken.UNI]: 'tUNIUSD',
  [KnownToken.CRV]: 'tCRVUSD',
  [KnownToken.BAL]: 'tBALUSD',
  // This feed doesnt exist
  // [KnownToken.FXS]: 'tFXSUSD',
};

export const bitfinexSymbolToKnownToken: Partial<Record<string, KnownToken>> = Object.keys(knownTokenToBitfinexSymbols).reduce((o, k) => ({
  ...o,
  [knownTokenToBitfinexSymbols[k as KnownToken] as string]: k
}), {});

export const createBitfinexWsFeeds = (tokens: KnownToken[]) => {
  const bitfinexTokens = tokens.filter((token) => !!knownTokenToBitfinexSymbols[token]);
  return bitfinexTokens.map((symbol) => ({
      channel: 'ticker' as const,
      symbol: knownTokenToBitfinexSymbols[symbol]
  }))
}

// all tickers https://ftx.com/api/markets
export const knownTokenToFTXSymbols: Record<KnownToken, string> = {
  [KnownToken.ETH]: 'ETH/USD',
  [KnownToken.BTC]: 'BTC/USD',
  [KnownToken.LINK]: 'LINK/USD',
  [KnownToken.UNI]: 'UNI/USD',
  [KnownToken.CRV]: 'CRV/USD',
  [KnownToken.FXS]: 'FXS/USD',
  [KnownToken.BAL]: 'BAL/USD',
};
export const ftxSymbolToKnownToken: Record<string, KnownToken> = Object.keys(knownTokenToFTXSymbols).reduce((o, k) => ({ ...o, [knownTokenToFTXSymbols[k as KnownToken]]: k }), {});

export const createFtxWsFeeds = (tokens: KnownToken[]) => tokens.map((market) => ({
  channel: 'ticker' as const,
  market: knownTokenToFTXSymbols[market]
}))

// all tickers https://api.crypto.com/v2/public/get-ticker
// dont fetch for all
export const knownTokenToCryptoComSymbols: Partial<Record<KnownToken, string>> = {
  // [KnownToken.ETH]: 'ETH_USD',
  [KnownToken.BTC]: 'BTC_USD',
  // [KnownToken.BTC]: 'WBTC_USD',
  // [KnownToken.LINK]: 'LINK_USD',
  // [KnownToken.UNI]: 'UNI_USD',
  // [KnownToken.CRV]: 'CRV_USD',
  [KnownToken.FXS]: 'FXS_USD',
  // [KnownToken.BAL]: 'BAL_USD',
};

export const cryptoComSymbolToKnownToken: Partial<Record<string, KnownToken>> = Object.keys(knownTokenToCryptoComSymbols).reduce((o, k) => ({
  ...o,
  [(knownTokenToCryptoComSymbols[k as KnownToken] as string)]: k
}), {})

export const createCryptoComWsFeeds = (tokens: KnownToken[]) => {
  const cryptoComTokens = tokens.filter((token) => !!knownTokenToCryptoComSymbols[token]);
  if (tokens.length === 0) return [];
  return [{
    params: {
      channels: cryptoComTokens.map((symbol) => `ticker.${knownTokenToCryptoComSymbols[symbol]}`)
    }
  }]
}


// all tickers https://api.exchange.coinbase.com/products
export const knownTokenToCoinbaseSymbols: Partial<Record<KnownToken, string>> = {
  [KnownToken.ETH]: 'ETH-USD',
  [KnownToken.BTC]: 'BTC-USD',
  // [KnownToken.BTC]: 'WBTC-USD',
  [KnownToken.LINK]: 'LINK-USD',
  [KnownToken.UNI]: 'UNI-USD',
  [KnownToken.CRV]: 'CRV-USD',
  [KnownToken.BAL]: 'BAL-USD',
}

export const coinbaseSymbolToKnownToken: Partial<Record<string, KnownToken>> = Object.keys(knownTokenToCoinbaseSymbols).reduce((o, k) => ({
  ...o,
  [(knownTokenToCoinbaseSymbols[k as KnownToken] as string)]: k
}), {})

export const createCoinbaseWsFeeds = (tokens: KnownToken[]): CoinbaseWsTopic[] => {
  const coinbaseTokens = tokens.filter((token) => !!knownTokenToCoinbaseSymbols[token]);
  if (tokens.length === 0) return [];
  return [{
    channels: ["ticker"],
    product_ids: coinbaseTokens.map((symbol) => knownTokenToCoinbaseSymbols[symbol] as string)
  }]
}

