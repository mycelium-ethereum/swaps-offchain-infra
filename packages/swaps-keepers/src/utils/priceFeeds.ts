import BN from 'bn.js';
import { knownTokenToBinanceSymbols, knownTokenToBitfinexSymbols } from '../constants/priceFeeds';
import { LabelledToken, TokenPriceInBits, TokenPriceBitArray, ParsedTokenPrice } from '../types';
import {MAX_PRICE_FEED_TOKENS_LENGTH} from '../constants';
import BigNumber from 'bignumber.js';
import {ethers} from 'ethers';

const BASE_CRYPTO_COM_URL = 'https://api.crypto.com'
export const tokensToCryptoComQuery = (/* tokens: LabelledToken[] */): string => {
  // Crypto.com doesnt have parameter fetching of multiple markets
  // you can either fetch all markets or single markets
  return `${BASE_CRYPTO_COM_URL}/v2/public/get-ticker`
};

const BASE_BINANCE_URL = 'https://api.binance.com/api/v3';
export const tokensToBinanceQuery = (tokens: LabelledToken[]): string => {
  const filteredTokens = (tokens.map((token) => knownTokenToBinanceSymbols[token.knownToken])).filter((token) => token !== undefined)
  const symbolsArray = `[${filteredTokens.map((token) => `"${token}"`).join(',')}]`;
  return `${BASE_BINANCE_URL}/ticker/price?symbols=${symbolsArray}`;
};

const BASE_FTX_URL = 'https://ftx.com/api/markets';
export const tokensToFTXQuery = () =>
  // FTX doesnt have parameter fetching of multiple markets
  // you can either fetch all markets or single markets
  `${BASE_FTX_URL}`;

const BASE_BITFINEX_URL = 'https://api-pub.bitfinex.com/v2';
export const tokensToBitfinexQuery = (tokens: LabelledToken[]) => `${BASE_BITFINEX_URL}/tickers?symbols=${tokens.map((token) => knownTokenToBitfinexSymbols[token.knownToken]).join(',')}`;

export const getPriceBits = (prices: ethers.BigNumber[] | BigNumber[]): TokenPriceInBits => {
  if (prices.length > MAX_PRICE_FEED_TOKENS_LENGTH) {
    throw new Error("max prices.length exceeded")
  }

  let priceBits = new BN('0')

  for (let j = 0; j < prices.length; j++) {
    const price = new BN(prices[j].toNumber());
    if (price.gt(new BN("2147483648"))) { // 2^31
      throw new Error(`price exceeds bit limit ${price.toString()}`)
    }

    priceBits = priceBits.or(price.shln(j * 32))
  }

  return priceBits.toString()
}

export const getPriceBitArray = (prices: number[]): TokenPriceBitArray => {
  const priceBitArray: string[] = []
  let shouldExit = false

  // @ts-ignore
  for (let i = 0; i < parseInt((prices.length - 1) / 8) + 1; i++) {
    let priceBits = new BN('0')
    for (let j = 0; j < 8; j++) {
      const index = i * 8 + j
      if (index >= prices.length) {
        shouldExit = true
        break
      }

      const price = new BN(prices[index])
      if (price.gt(new BN("2147483648"))) { // 2^31
        throw new Error(`price exceeds bit limit ${price.toString()}`)
      }
      priceBits = priceBits.or(price.shln(j * 32))
    }

    priceBitArray.push(priceBits.toString())

    if (shouldExit) { break }
  }

  return priceBitArray
}

export const orderPrices = (tokens: LabelledToken[], tokenPrices: ParsedTokenPrice[]): ParsedTokenPrice[] => {
  const parsedResults = tokenPrices.map((token) => {
    // find the token
    const knownToken = tokens.find((token_) => token_.knownToken === token.knownToken);
    if (!knownToken) { // throw error if the token is not a known token
      throw Error(`Unknown token: ${token.knownToken}`)
    }
    return ({
      price: token.price,
      knownToken: token.knownToken
    })
  })

  const sortedParsedResults = parsedResults.sort((a, b) => {
    const indexA = tokens.findIndex((t) => t.knownToken === a.knownToken);
    const indexB = tokens.findIndex((t) => t.knownToken === b.knownToken);
    return indexA - indexB
  })
  return sortedParsedResults;
}
