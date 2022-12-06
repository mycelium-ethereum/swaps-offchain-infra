import { ethers } from "ethers";
import {
    binanceSymbolToKnownToken,
    bitfinexSymbolToKnownToken,
    coinbaseSymbolToKnownToken,
    cryptoComSymbolToKnownToken,
    ftxSymbolToKnownToken,
    knownTokenToBitfinexSymbols,
} from "../constants";
import { WsVerifiedTopicList } from "./wsStore";
import { KnownToken, WsUpdate } from "../types";

export function getWsSubscribeMessage(wsKey: string) {
    if (wsKey === "ftx") {
        return { op: "subscribe" };
    } else if (wsKey === "binance") {
        return { method: "SUBSCRIBE" };
    } else if (wsKey === "bitfinex") {
        return { event: "subscribe" };
    } else if (wsKey === "cryptoCom") {
        return { method: "subscribe" };
    } else if (wsKey === "coinbase") {
        return {
            type: "subscribe",
        };
    } else {
        throw Error("Unknown wsKey");
    }
}

export function getWsUnsubscribeMessage(wsKey: string) {
    if (wsKey === "ftx") {
        return { op: "unsubscribe" };
    } else if (wsKey === "binance") {
        return { method: "UNSUBSCRIBE" };
    } else if (wsKey === "bitfinex") {
        return { method: "unsubscribe" };
    } else if (wsKey === "coinbase") {
        return { type: "unsubscribe" };
    } else {
        throw Error("Unknown wsKey");
    }
}

export function getWsHeartBeatMessage(wsKey: string, msg: any) {
    if (wsKey === "ftx") {
        return;
    } else if (wsKey === "binance") {
        return;
    } else if (wsKey === "bitfinex") {
        return;
    } else if (wsKey === "cryptoCom") {
        return {
            method: "public/respond-heartbeat",
            id: msg.id,
        };
    } else {
        throw Error("Unknown wsKey");
    }
}

export function getWsPingMessage(wsKey: string) {
    if (wsKey === "ftx") {
        return { op: "ping" };
    } else if (wsKey === "binance") {
        // no ping message for binance
        return;
    } else if (wsKey === "bitfinex") {
        return { event: "ping" };
    } else if (wsKey === "cryptoCom") {
        // no ping message for cryptoCom
        return;
    } else if (wsKey === "coinbase") {
        // no ping message for coinbase
        return;
    } else {
        throw Error("Unknown wsKey");
    }
}

export function getTopicKey(wsKey: string, msg: any) {
    if (wsKey === "bitfinex") {
        return msg[0];
    } else {
        throw Error("Unknown wsKey");
    }
}

export function getSubscriptionInfo(wsKey: string, msg: any): { key: string; token: KnownToken } {
    if (wsKey === "bitfinex") {
        const token = bitfinexSymbolToKnownToken[msg.symbol];
        if (!token) {
            throw Error(`Unknown token: ${msg.symbol}`);
        }
        return {
            key: msg.chanId,
            token,
        };
    } else {
        throw Error("Unknown wsKey");
    }
}

export function isWsPong(message: any): boolean {
    return message?.type === "pong";
}

export function isUpdateMessage(wsKey: string, msg: any, verifySubscriptions: WsVerifiedTopicList): boolean {
    if (wsKey === "ftx" && msg.channel && msg.type === "update") {
        return true;
    } else if (wsKey === "binance" && msg.stream) {
        return true;
    } else if (wsKey === "bitfinex" && verifySubscriptions[msg[0]] && msg[1] !== "hb") {
        return true;
    } else if (wsKey === "cryptoCom" && msg.method === "subscribe" && !!msg.result) {
        return true;
    } else if (wsKey === "coinbase" && msg.type === "ticker") {
        return true;
    } else {
        return false;
    }
}

export function isHeartBeatMessage(wsKey: string, msg: any): boolean {
    if (wsKey === "cryptoCom" && msg.method === "public/heartbeat") {
        return true;
    } else {
        return false;
    }
}

export function isSubscriptionResponse(wsKey: string, msg: any): boolean {
    if (wsKey === "bitfinex" && msg.event === "subscribed") {
        return true;
    } else {
        return false;
    }
}

export interface WSClientConfigurableOptions {
    // Required for authenticated channels
    key?: string;
    secret?: string;

    // Subaccount nickname URI-encoded
    subAccountName?: string;

    pongTimeout?: number;
    pingInterval?: number;
    reconnectTimeout?: number;
    reconnectOnClose?: boolean;

    // Optionally override websocket API protocol + domain
    wsUrl: string;
}

export interface WebsocketClientOptions extends WSClientConfigurableOptions {
    pongTimeout: number;
    pingInterval: number;
    reconnectTimeout: number;
    reconnectOnClose: boolean;
}

export type GenericAPIResponse = Promise<any>;

export function serializeParams(params: object = {}, strict_validation = false): string {
    return Object.keys(params)
        .sort()
        .map((key) => {
            // @ts-ignore
            const value = params[key];
            if (strict_validation === true && typeof value === "undefined") {
                throw new Error("Failed to sign API request due to undefined parameter");
            }
            return `${key}=${value}`;
        })
        .join("&");
}

export function serializeParamPayload(
    isGetRequest: boolean,
    params?: string | object,
    strictParamValidation?: boolean
): string | undefined {
    if (!params) {
        return "";
    }
    if (!isGetRequest) {
        return JSON.stringify(params);
    }
    if (typeof params === "string") {
        return "?" + params;
    }
    return "?" + serializeParams(params, strictParamValidation);
}

export type apiNetwork = "ftxcom" | "ftxus";
export const programId = "ftxnodeapi";
export const programId2 = "ftxnodeapi2";
export const programKey = "externalReferralProgram";

export function isPublicEndpoint(endpoint: string): boolean {
    if (endpoint.startsWith("https")) {
        return true;
    }
    if (endpoint.startsWith("v2/public")) {
        return true;
    }
    if (endpoint.startsWith("public/linear")) {
        return true;
    }
    return false;
}

export function parseRawWsMessage(event: MessageEvent): any {
    if (typeof event === "string") {
        const parsedEvent = JSON.parse(event);

        if (parsedEvent.data) {
            if (typeof parsedEvent.data === "string") {
                return parseRawWsMessage(parsedEvent.data);
            }
            return parsedEvent.data;
        }
    }
    if (event?.data) {
        return JSON.parse(event.data);
    }
    return event;
}

export function parseUpdateMessage(
    wsKey: string,
    msg: any,
    verifiedSubscriptions: WsVerifiedTopicList
): WsUpdate | any {
    let knownToken, lastPrice, bestBid, bestAsk;
    try {
        if (wsKey === "ftx") {
            // https://docs.ftx.com/#public-channels
            knownToken = ftxSymbolToKnownToken[msg.market];
            lastPrice = ethers.utils.parseEther(msg.data.last.toString());
            bestBid = ethers.utils.parseEther(msg.data.bid.toString());
            bestAsk = ethers.utils.parseEther(msg.data.ask.toString());
        } else if (wsKey === "binance") {
            // https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md#individual-symbol-ticker-streams
            knownToken = binanceSymbolToKnownToken[msg.data.s];
            lastPrice = ethers.utils.parseEther(msg.data.c);
            bestBid = ethers.utils.parseEther(msg.data.b.toString());
            bestAsk = ethers.utils.parseEther(msg.data.a.toString());
        } else if (wsKey === "bitfinex") {
            // https://docs.bitfinex.com/reference/ws-public-ticker
            knownToken = verifiedSubscriptions[msg[0]];
            // check that the verified symbol matches a known bitfinex ticker
            if (!knownTokenToBitfinexSymbols[knownToken]) {
                knownToken = undefined;
            }
            lastPrice = ethers.utils.parseEther(msg[1][6].toString());
            bestBid = ethers.utils.parseEther(msg[1][0].toString());
            bestAsk = ethers.utils.parseEther(msg[1][2].toString());
        } else if (wsKey === "cryptoCom") {
            knownToken = cryptoComSymbolToKnownToken[msg.result.instrument_name];
            const info = msg.result.data[0];
            lastPrice = ethers.utils.parseEther(info.a.toString());
            bestBid = ethers.utils.parseEther(info.b.toString());
            bestAsk = ethers.utils.parseEther(info.k.toString());
        } else if (wsKey === "coinbase") {
            knownToken = coinbaseSymbolToKnownToken[msg.product_id];
            lastPrice = ethers.utils.parseEther(msg.price.toString());
            bestBid = ethers.utils.parseEther(msg.best_bid.toString());
            bestAsk = ethers.utils.parseEther(msg.best_ask.toString());
        }
    } catch (error) {
        console.error(`Failed to parse ${wsKey} update message`, msg, error);
        throw error;
    }

    if (!knownToken || !bestBid || !bestAsk || !lastPrice) {
        console.error(`Failed to parse ${wsKey} update message`, msg);
        throw Error(`Failed to parse ${wsKey} update message. Missing item`);
    }

    const price = bestBid.add(bestAsk).div(2);

    return { knownToken, price, lastPrice };
}
