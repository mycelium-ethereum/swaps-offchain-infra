import { ethers } from "ethers";
import { KnownToken } from "./tokens";

export type WsKey = "binance" | "ftx" | "bitfinex" | "cryptoCom" | "coinbase";

export interface FtxWsTopic {
    channel: "ticker"; // | 'orderbook' | 'orderbookGrouped' | 'markets' | 'trades' | 'ticker' | 'fills' | 'orders' | string;
    grouping?: number;
    market?: string;
}

export interface BinanceWsTopic {
    params: string[];
    id: number;
}

export interface BitfinexWsTopic {
    channel: "ticker";
    symbol: string;
}

export interface CryptoComWsTopic {
    // channel: 'ticker'
    // symbol: string[];
    // "id": 11,
    // method: string,
    params: {
        channels: string[];
    };
    // "nonce": 1587523073344
}

export interface CoinbaseWsTopic {
    channels: string[];
    product_ids: string[];
}

export type WsTopic = FtxWsTopic | BinanceWsTopic | BitfinexWsTopic | CryptoComWsTopic | CoinbaseWsTopic;
export type WsUpdate = { knownToken: KnownToken; price: ethers.BigNumber };

export type FTXUpdateMessage = {
    channel: string;
    market: string;
    type: string;
    data: {
        bid: string;
        ask: string;
        bidSize: string;
        askSize: string;
        last: string;
        time: string;
    };
};

export type BinanceUpdateMessage = {
    stream: string;
    data: {
        // "e": "24hrTicker",  // Event type
        // "E": 123456789,     // Event time
        s: string; // Symbol
        // "p": "0.0015",      // Price change
        // "P": "250.00",      // Price change percent
        // "w": "0.0018",      // Weighted average price
        // "x": "0.0009",      // First trade(F)-1 price (first trade before the 24hr rolling window)
        c: string; // Last price
        // "Q": "10",          // Last quantity
        b: string; // Best bid price
        // "B": "10",          // Best bid quantity
        a: string; // Best ask price
        // "A": "100",         // Best ask quantity
        // "o": "0.0010",      // Open price
        // "h": "0.0025",      // High price
        // "l": "0.0010",      // Low price
        // "v": "10000",       // Total traded base asset volume
        // "q": "18",          // Total traded quote asset volume
        // "O": 0,             // Statistics open time
        // "C": 86400000,      // Statistics close time
        // "F": 0,             // First trade ID
        // "L": 18150,         // Last trade Id
        // "n": 18151          // Total number of trades
    };
};

export type BitfinexUpdateMessage = [string, Array<string>];
// [
// CHANNEL_ID,
// [
// BID,
// BID_SIZE,
// ASK,
// ASK_SIZE,
// DAILY_CHANGE,
// DAILY_CHANGE_RELATIVE,
// LAST_PRICE,
// VOLUME,
// HIGH,
// LOW
// ]
// ]

export type CryptoComUpdateMessage = {
    id: number;
    code: number;
    method: "subscribe";
    result: {
        channel: "ticker";
        instrument_name: string;
        subscription: string;
        id: number;
        data: {
            // h: 1, // Price of the 24h highest trade
            // v: 10232.26315789, // The total 24h traded volume
            a: string; // The price of the latest trade, null if there weren't any trades
            // l: 0.01, // Price of the 24h lowest trade, null if there weren't any trades
            b: string; // The current best bid price, null if there aren't any bids
            k: string; // The current best ask price, null if there aren't any asks
            // c: -0.44564773, // 24-hour price change, null if there weren't any trades
            // t: 1587523078844 // update time
        }[];
    };
};

export type CoinbaseUpdateMessage = {
    type: "ticker";
    // sequence: 38592062963,
    product_id: string;
    price: string;
    // open_24h: '1311.68',
    // volume_24h: '1447678.64340923',
    // low_24h: '1071.11',
    // high_24h: '1318.13',
    // volume_30d: '13261093.34457939',
    best_bid: string;
    // best_bid_size: '0.00000946',
    best_ask: string;
    // best_ask_size: '2.99629573',
    // side: 'buy',
    // time: '2022-11-10T03:56:28.907384Z',
    // trade_id: 382032333,
    // last_size: '0.32103707'
};

export type BitfinexSubscriptionMessage = {
    event: "subscribed";
    channel: "ticker";
    chanId: string;
    symbol: string;
};
