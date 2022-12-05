import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { KnownToken } from "../types/tokens";

export type Price = BigNumber;

export type ParsedTokenPrice = {
    knownToken: KnownToken;
    price: ethers.BigNumber;
};
export type TokenPrices = ethers.BigNumber[];

export type TokenPriceInBits = string;
export type TokenPriceBitArray = string[];

export type BinancePrice = {
    symbol: string;
    price: string;
};

export type CryptoComPrice = {
    i: string; // Instrument Name, e.g. BTC_USDT, ETH_CRO, etc.
    b: number; // The current best bid price, null if there aren't any bids
    k: number; // The current best ask price, null if there aren't any asks
    a: number; // The price of the latest trade, null if there weren't any trades
    t: number; // Timestamp of the data
    v: number; // The total 24h traded volume
    h: number; // Price of the 24h highest trade
    l: number; // Price of the 24h lowest trade, null if there weren't any trades
    c: number; // 24-hour price change, null if there weren't any trade
};

export type FTXPrice = {
    name: string;
    price: number; // current average price
    // enabled: true,
    // postOnly: false,
    // priceIncrement: 1,
    // sizeIncrement: 0.0001,
    // minProvideSize: 0.0001,
    // last: 30624,
    bid: string; // best bid
    ask: string; // best ask
    // type: spot,
    // baseCurrency: BTC,
    // isEtfMarket: false,
    // quoteCurrency: USD,
    // underlying: null,
    // restricted: false,
    // highLeverageFeeExempt: true,
    // largeOrderThreshold: 5000,
    // change1h: 0.007567283016384813,
    // change24h: 0.027651006711409395,
    // changeBod: 0.007368421052631579,
    // quoteVolume24h: 686787739.2979,
    // volumeUsd24h: 686787739.2979,
    // priceHigh24h: 30678,
    // priceLow24h: 29569
};

// https://docs.bitfinex.com/reference/rest-public-tickers
export const bitfinexSymbolIndex = 0;
export const bitfinexBestBidPriceIndex = 1;
export const bitfinexBestAskPriceIndex = 3;
export type BitfinexPrice = [
    string, // symbol
    number, // flash return rate (funding tickers only)
    number, // BID	float	Price of last highest bid
    number, // BID_PERIOD	int	Bid period covered in days (funding tickers only)
    number, // BID_SIZE	float	Sum of the 25 highest bid sizes
    number, // ASK	float	Price of last lowest ask
    number, // ASK_PERIOD	int	Ask period covered in days (funding tickers only)
    number, // ASK_SIZE	float	Sum of the 25 lowest ask sizes
    number, // DAILY_CHANGE	float	Amount that the last price has changed since yesterday
    number, // DAILY_CHANGE_RELATIVE	float	Relative price change since yesterday (*100 for percentage change)
    number, // LAST_PRICE	float	Price of the last trade
    number, // VOLUME	float	Daily volume
    number, // HIGH	float	Daily high
    number, // LOW	float	Daily low
    number // FRR_AMOUNT_AVAILABLE	float	The amount of funding that is available at the Flash Return Rate (funding tickers only)
];
