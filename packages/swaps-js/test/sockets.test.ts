import { ethers } from "ethers";
import {
    KnownToken,
    WsKey,
    FTXUpdateMessage,
    BinanceUpdateMessage,
    CryptoComUpdateMessage,
    CoinbaseUpdateMessage,
    BitfinexUpdateMessage,
    BitfinexSubscriptionMessage,
} from "../src/types";

import { WebsocketClient } from "../src/utils/socketClient";
// import { WS } from 'jest-websocket-mock';
// import { createBinanceWsFeeds } from '../src/constants';
// import { KnownToken } from '../src/types';
// import { parseRawWsMessage } from '../src/utils/wsMessages';

const WS_URL = "ws://localhost:8080";

// const tokens = [KnownToken.ETH];

// let server: any, mockClient: any;
let binanceSocket: any, ftxSocket: any, bitfinexSocket: any, cryptoComSocket: any, coinbaseSocket: any;

beforeEach(async () => {
    // server = new WS(WS_URL, { jsonProtocol: true });
    // WebsocketClient.connectToWsUrl.mockImplementation()

    binanceSocket = new WebsocketClient("binance", {
        wsUrl: WS_URL,
    });
    ftxSocket = new WebsocketClient("ftx", {
        wsUrl: WS_URL,
    });
    bitfinexSocket = new WebsocketClient("bitfinex", {
        wsUrl: WS_URL,
    });
    cryptoComSocket = new WebsocketClient("cryptoCom", {
        wsUrl: WS_URL,
    });
    coinbaseSocket = new WebsocketClient("coinbase", {
        wsUrl: WS_URL,
    });

    // socket.subscribe([ KnownToken.ETH ]);
    // await server.connected;
});

afterEach(() => {
    // WS.clean();
    // (WebsocketClient as any).mockClear();
});

type CEXSubscriptionMethod = BitfinexSubscriptionMessage | undefined;

function constructSubscriptionMessage(
    wsKey: WsKey,
    overrides?: { market?: string; chanId?: string }
): CEXSubscriptionMethod {
    if (wsKey === "bitfinex") {
        return {
            event: "subscribed",
            channel: "ticker",
            chanId: overrides?.chanId ?? "1",
            symbol: overrides?.market ?? "tETHUSD",
        };
    }
    return undefined;
}
type CEXUpdateMessage =
    | FTXUpdateMessage
    | BinanceUpdateMessage
    | BitfinexUpdateMessage
    | CryptoComUpdateMessage
    | CoinbaseUpdateMessage
    | undefined;

function constructUpdateMessage(
    wsKey: WsKey,
    lastPrice: string,
    bid: string,
    ask: string,
    overrides?: {
        market?: string;
        type?: string;
        channel?: string;
        stream?: string;
    }
): CEXUpdateMessage {
    if (wsKey === "binance") {
        return {
            stream: overrides?.stream ?? "test@ticker",
            data: {
                s: overrides?.market ?? "ETHUSDT",
                c: lastPrice,
                b: bid,
                a: ask,
            },
        };
    } else if (wsKey === "ftx") {
        return {
            channel: "ticker",
            type: "update",
            market: overrides?.market ?? "ETH/USD",
            data: {
                last: lastPrice,
                bid: bid,
                ask: ask,
                bidSize: "0",
                askSize: "0",
                time: "0",
            },
        };
    } else if (wsKey === "bitfinex") {
        return [
            "1", // CHANNEL_ID,
            [
                bid, // BID
                "0", // BID_SIZE,
                ask, // ASK,
                "0", // ASK_SIZE,
                "0", // DAILY_CHANGE,
                "0", // DAILY_CHANGE_RELATIVE,
                lastPrice, // LAST_PRICE,
                "0", // VOLUME,
                "0", // HIGH,
                "0", // LOW
            ],
        ];
    } else if (wsKey === "cryptoCom") {
        return {
            id: 1,
            code: 0,
            method: "subscribe",
            result: {
                channel: "ticker",
                instrument_name: overrides?.market ?? "FXS_USD",
                subscription: "FXS_USD",
                id: 1,
                data: [
                    {
                        k: ask,
                        b: bid,
                        a: lastPrice,
                    },
                ],
            },
        };
    } else if (wsKey === "coinbase") {
        return {
            type: "ticker",
            product_id: overrides?.market ?? "ETH-USD",
            price: lastPrice,
            best_bid: bid,
            best_ask: ask,
        };
    } // else
    return undefined;
}

describe("Message handling", () => {
    describe("Update message handling", () => {
        test("Parse update message", () => {
            const testUpdateMessage = (wsKey: WsKey, socket: any, expectedToken?: KnownToken) => {
                const updateMessage = constructUpdateMessage(wsKey, "999", "1000", "1000");
                let result: any;
                socket.on("update", (data: any) => {
                    result = data;
                });
                const m = new MessageEvent("message", {
                    data: JSON.stringify(updateMessage),
                });
                socket.onWsMessage(m, wsKey);

                expect(result).toBeTruthy();
                expect(result.knownToken).toEqual(expectedToken ?? "ETH");
                expect(result.price.toString()).toEqual(ethers.utils.parseEther("1000").toString());
                expect(result.lastPrice.toString()).toEqual(ethers.utils.parseEther("999").toString());
            };

            testUpdateMessage("binance", binanceSocket);
            testUpdateMessage("ftx", ftxSocket);

            bitfinexSocket.wsStore.verifySubscription("bitfinex", "1", KnownToken.ETH);
            testUpdateMessage("bitfinex", bitfinexSocket);
            testUpdateMessage("cryptoCom", cryptoComSocket, KnownToken.FXS);
            testUpdateMessage("coinbase", coinbaseSocket);
        });
        test("Incomplete update message", () => {
            const testUpdateMessage = (wsKey: WsKey, socket: any) => {
                let error: any;
                socket.on("error", (data: any) => {
                    error = data;
                });
                const hiddenNull: string = null as unknown as string;

                let updateMessage = constructUpdateMessage(wsKey, hiddenNull, "1000", "1000");
                let m = new MessageEvent("message", {
                    data: JSON.stringify(updateMessage),
                });
                socket.onWsMessage(m, wsKey);

                expect(error.wsKey).toEqual(wsKey);
                expect(error.type).toEqual("ON_WS_MESSAGE");

                updateMessage = constructUpdateMessage(wsKey, "1000", hiddenNull, "1000");
                m = new MessageEvent("message", {
                    data: JSON.stringify(updateMessage),
                });
                socket.onWsMessage(m, wsKey);
                expect(error.wsKey).toEqual(wsKey);
                expect(error.type).toEqual("ON_WS_MESSAGE");

                updateMessage = constructUpdateMessage(wsKey, "1000", "1000", hiddenNull);
                m = new MessageEvent("message", {
                    data: JSON.stringify(updateMessage),
                });
                socket.onWsMessage(m, wsKey);
                expect(error.wsKey).toEqual(wsKey);
                expect(error.type).toEqual("ON_WS_MESSAGE");

                updateMessage = constructUpdateMessage(wsKey, "1000", "1000", "1000", {
                    market: "unknown",
                });
                m = new MessageEvent("message", {
                    data: JSON.stringify(updateMessage),
                });
                socket.onWsMessage(m, wsKey);
                expect(error.wsKey).toEqual(wsKey);
                expect(error.type).toEqual("ON_WS_MESSAGE");
            };

            testUpdateMessage("binance", binanceSocket);
            testUpdateMessage("ftx", ftxSocket);
            testUpdateMessage("cryptoCom", cryptoComSocket);
            testUpdateMessage("coinbase", coinbaseSocket);

            bitfinexSocket.wsStore.verifySubscription("bitfinex", "1", KnownToken.ETH);
            testUpdateMessage("bitfinex", bitfinexSocket);
        });
        test("Unknown token ticker message", () => {
            const testUpdateMessage = (wsKey: WsKey, socket: any, expectResponse?: boolean) => {
                let error: any, response: any;
                socket.on("error", (data: any) => {
                    error = data;
                });
                if (expectResponse) {
                    socket.on("response", (data: any) => {
                        response = data;
                    });
                }

                const updateMessage = constructUpdateMessage(wsKey, "1000", "1000", "1000", {
                    market: "UNKNOWN/MARKET",
                });
                const m = new MessageEvent("message", {
                    data: JSON.stringify(updateMessage),
                });
                socket.onWsMessage(m, wsKey);

                if (expectResponse) {
                    expect(response).toBeTruthy();
                    return;
                } else {
                    expect(error).toBeTruthy();
                    expect(error.wsKey).toEqual(wsKey);
                    expect(error.type).toEqual("ON_WS_MESSAGE");
                }
            };

            testUpdateMessage("binance", binanceSocket);
            testUpdateMessage("ftx", ftxSocket);
            testUpdateMessage("cryptoCom", cryptoComSocket);
            testUpdateMessage("coinbase", coinbaseSocket);

            // no verified subscription
            testUpdateMessage("bitfinex", bitfinexSocket, true);
            // when there is verified subscription it will not get handled as an update message
            bitfinexSocket.wsStore.verifySubscription("bitfinex", "1", "UNKNOWN/MARKET");
            testUpdateMessage("bitfinex", bitfinexSocket);
        });
        test("Invalid update message", () => {
            const testUpdateMessage = (wsKey: WsKey, socket: any) => {
                let result: any;
                socket.on("update", (data: any) => {
                    result = data;
                });
                const m = new MessageEvent("message", {
                    data: JSON.stringify({ type: "not an update message" }),
                });
                socket.onWsMessage(m, wsKey);

                expect(result).toBeFalsy();
            };

            testUpdateMessage("binance", binanceSocket);
            testUpdateMessage("ftx", ftxSocket);
            testUpdateMessage("cryptoCom", cryptoComSocket);
            testUpdateMessage("coinbase", coinbaseSocket);

            bitfinexSocket.wsStore.verifySubscription("bitfinex", "1", KnownToken.ETH);
            testUpdateMessage("bitfinex", bitfinexSocket);
        });
    });
    describe("Subscription message handling", () => {
        test("Parse subscription message", () => {
            const testSubscriptionMessage = (wsKey: WsKey, socket: any, expectSubscription?: true) => {
                let result: any;
                // socket.on('update', (data: any) => { result = data });
                socket.on("response", (data: any) => {
                    result = data;
                });
                const subscriptionMessage = constructSubscriptionMessage(wsKey);
                const m = new MessageEvent("message", {
                    data: JSON.stringify(subscriptionMessage),
                });
                socket.onWsMessage(m, wsKey);

                const verifiedSubscriptions = socket.wsStore.getVerifiedTopics(wsKey);
                if (expectSubscription) {
                    expect(result).toBeFalsy();
                    expect(verifiedSubscriptions).toEqual({
                        "1": KnownToken.ETH,
                    });
                } else {
                    expect(result).toBeTruthy();
                    expect(verifiedSubscriptions).toEqual({});
                }
            };
            testSubscriptionMessage("binance", binanceSocket);
            testSubscriptionMessage("ftx", ftxSocket);
            testSubscriptionMessage("cryptoCom", cryptoComSocket);
            testSubscriptionMessage("coinbase", coinbaseSocket);

            // bitfinex is the only one that actually has subscription messages;
            testSubscriptionMessage("bitfinex", bitfinexSocket, true);
        });
        test("Unknown in subscription message token", () => {
            const testSubscriptionMessage = (wsKey: WsKey, socket: any, expectSubscription?: true) => {
                let result: any, error: any;
                socket.on("response", (data: any) => {
                    result = data;
                });
                socket.on("error", (data: any) => {
                    error = data;
                });
                const subscriptionMessage = constructSubscriptionMessage(wsKey, {
                    market: "unknownTokenSymbol",
                });
                const m = new MessageEvent("message", {
                    data: JSON.stringify(subscriptionMessage),
                });

                socket.onWsMessage(m, wsKey);
                const verifiedSubscriptions = socket.wsStore.getVerifiedTopics(wsKey);
                if (expectSubscription) {
                    expect(result).toBeFalsy();
                    expect(error).toBeTruthy();
                    expect(error.wsKey).toEqual("bitfinex");
                    expect(error.type).toEqual("ON_WS_MESSAGE");
                    expect(error.error.toString()).toEqual("Error: Unknown token: unknownTokenSymbol");
                    expect(verifiedSubscriptions).toEqual({});
                } else {
                    expect(result).toBeTruthy();
                    expect(error).toBeFalsy();
                    expect(verifiedSubscriptions).toEqual({});
                }
            };
            testSubscriptionMessage("binance", binanceSocket);
            testSubscriptionMessage("ftx", ftxSocket);
            testSubscriptionMessage("cryptoCom", cryptoComSocket);
            testSubscriptionMessage("coinbase", coinbaseSocket);

            // bitfinex is the only one that actually has subscription messages;
            testSubscriptionMessage("bitfinex", bitfinexSocket, true);
        });
    });
});

// test("Correctly connects to 1 socket with 1 feed", async () => {
// console.log(socket, mockClient);
// const messages = { client: [] };

// socket.on('update', (data: any) => console.log("Hello world", data));
// socket.on('error', (data: any) => console.log("Hello world error", data));
// server.send(expectedMessages.ftx);

// expect(messages).toEqual({
// client: ["hello everyone"],
// });
// });
