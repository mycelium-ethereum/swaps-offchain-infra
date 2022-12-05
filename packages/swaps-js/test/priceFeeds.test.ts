import {
    NETWORK,
    KnownTokenMap,
    createBinanceWsFeeds,
    createBitfinexWsFeeds,
    createCryptoComWsFeeds,
    createFtxWsFeeds,
} from "../src/constants";
import { KnownToken } from "../src/types";

const binanceFeeds = [
    "ethusdt@ticker",
    // 'wbtcbusd@ticker',
    "btcusdt@ticker",
    "linkusdt@ticker",
    "uniusdt@ticker",
    "crvusdt@ticker",
    "fxsusdt@ticker",
    "balusdt@ticker",
];

const bitfinexFeeds = ["tETHUSD", "tBTCUSD", "tLINK:USD", "tUNIUSD", "tCRVUSD", "tBALUSD"];

const ftxFeeds = ["ETH/USD", "BTC/USD", "LINK/USD", "UNI/USD", "CRV/USD", "FXS/USD", "BAL/USD"];

const cryptoComFeeds = [
    // 'ETH_USD',
    "BTC_USD",
    // 'WBTC_USD',
    // 'LINK_USD',
    // 'UNI_USD',
    // 'CRV_USD',
    "FXS_USD",
    // 'BAL_USD',
];

const coinbaseFeeds = [
    "ETH-USD",
    "BTC-USD",
    // 'WBTC-USD',
    "LINK-USD",
    "UNI-USD",
    "CRV-USD",
    "BAL-USD",
];

const expectedTokenFeeds = {
    [KnownToken.ETH]: {
        binance: {
            params: ["ethusdt@ticker"],
            id: 1,
        },
        ftx: {
            channel: "ticker",
            market: "ETH/USD",
        },
        bitfinex: {
            channel: "ticker",
            symbol: "tETHUSD",
        },
        cryptoCom: {
            params: {
                channels: ["ticker.ETH_USD"],
            },
        },
        coinbase: {
            channels: ["ticker"],
            product_ids: ["ETH-USD"],
        },
    },
    [KnownToken.FXS]: {
        cryptoCom: {
            params: {
                channels: ["ticker.FXS_USD"],
            },
        },
    },
    all: {
        binance: [
            {
                params: binanceFeeds,
                id: 1,
            },
        ],
        bitfinex: bitfinexFeeds.map((symbol) => ({
            channel: "ticker",
            symbol,
        })),
        ftx: ftxFeeds.map((market) => ({ channel: "ticker", market })),
        cryptoCom: [
            {
                params: {
                    channels: cryptoComFeeds.map((symbol) => `ticker.${symbol}`),
                },
            },
        ],
        coinbase: [
            {
                channels: ["ticker"],
                product_ids: coinbaseFeeds,
            },
        ],
    },
};

describe("Creates appropriate feeds", () => {
    test("No tokens", () => {
        const tokens: KnownToken[] = [];
        const binanceFeeds = createBinanceWsFeeds(tokens);
        const ftxFeeds = createFtxWsFeeds(tokens);
        const bitfinexFeeds = createBitfinexWsFeeds(tokens);
        const cryptoComFeeds = createCryptoComWsFeeds(tokens);

        expect(binanceFeeds).toEqual([]);
        expect(ftxFeeds).toEqual([]);
        expect(bitfinexFeeds).toEqual([]);
        expect(cryptoComFeeds).toEqual([]);
    });
    test("Some tokens", () => {
        const tokens: KnownToken[] = [KnownToken.ETH];
        const binanceFeeds = createBinanceWsFeeds(tokens);
        const ftxFeeds = createFtxWsFeeds(tokens);
        const bitfinexFeeds = createBitfinexWsFeeds(tokens);

        const expected = expectedTokenFeeds[KnownToken.ETH];
        expect(binanceFeeds).toEqual([expected.binance]);
        expect(ftxFeeds).toEqual([expected.ftx]);
        expect(bitfinexFeeds).toEqual([expected.bitfinex]);

        // test on FXS instead
        const cryptoComFeeds = createCryptoComWsFeeds([KnownToken.FXS]);
        expect(cryptoComFeeds).toEqual([expectedTokenFeeds[KnownToken.FXS].cryptoCom]);
    });
    test("All possible tokens", () => {
        const tokens: KnownToken[] = Object.values(KnownTokenMap[NETWORK.ARBITRUM_MAINNET]);
        const binanceFeeds = createBinanceWsFeeds(tokens);
        const ftxFeeds = createFtxWsFeeds(tokens);
        const bitfinexFeeds = createBitfinexWsFeeds(tokens);
        const cryptoComFeeds = createCryptoComWsFeeds(tokens);

        const expected = expectedTokenFeeds.all;

        expect(binanceFeeds[0].params.sort()).toEqual(expected.binance[0].params.sort());
        expect(binanceFeeds[0].id).toEqual(expected.binance[0].id);
        // jest is better at matching sets, these array may have different orders
        expect(new Set(ftxFeeds)).toEqual(new Set(expected.ftx));
        expect(new Set(bitfinexFeeds)).toEqual(new Set(expected.bitfinex));
        expect(cryptoComFeeds[0].params.channels.sort()).toEqual(expected.cryptoCom[0].params.channels.sort());
    });
});
