import WebSocket from "ws";
import { WsConnectionState } from "./socketClient";
import { KnownToken, WsTopic } from "../types";
import { logger } from "../utils";

type WsTopicList = Set<WsTopic>;
type KeyedWsTopicLists = {
    [key: string]: WsTopicList;
};

export type WsVerifiedTopicList = Record<string, KnownToken>;

interface WsStoredState {
    ws?: WebSocket;
    connectionState?: WsConnectionState;
    activePingTimer?: NodeJS.Timeout | undefined;
    activePongTimer?: NodeJS.Timeout | undefined;
    subscribedTopics: WsTopicList;
    verifiedTopics: WsVerifiedTopicList;
}

function isDeepObjectMatch(object1: any, object2: any) {
    for (const key in object1) {
        if (object1[key] !== object2[key]) {
            return false;
        }
    }
    return true;
}

export default class WsStore {
    private wsState: {
        [key: string]: WsStoredState;
    };

    constructor() {
        this.wsState = {};
    }

    get(key: string, createIfMissing?: boolean): WsStoredState | undefined {
        if (this.wsState[key]) {
            return this.wsState[key];
        }

        if (createIfMissing) {
            return this.create(key);
        }

        return undefined;
    }

    getKeys(): string[] {
        return Object.keys(this.wsState);
    }

    create(key: string): WsStoredState | undefined {
        if (this.hasExistingActiveConnection(key)) {
            logger.warning("WsStore setConnection() overwriting existing open connection: ", this.getWs(key));
        }
        this.wsState[key] = {
            subscribedTopics: new Set(),
            verifiedTopics: {},
            connectionState: WsConnectionState.READY_STATE_INITIAL,
        };
        return this.get(key);
    }

    delete(key: string) {
        if (this.hasExistingActiveConnection(key)) {
            const ws = this.getWs(key);
            logger.warning("WsStore deleting state for connection still open: ", ws);
            ws?.close();
        }
        delete this.wsState[key];
    }

    /* connection websocket */

    hasExistingActiveConnection(key: string) {
        return this.get(key) && this.isWsOpen(key);
    }

    getWs(key: string): WebSocket | undefined {
        return this.get(key)?.ws;
    }

    setWs(key: string, wsConnection: WebSocket): WebSocket {
        if (this.isWsOpen(key)) {
            logger.warning("WsStore setConnection() overwriting existing open connection: ", this.getWs(key));
        }
        this.get(key, true)!.ws = wsConnection;
        return wsConnection;
    }

    /* connection state */

    isWsOpen(key: string): boolean {
        const existingConnection = this.getWs(key);
        return !!existingConnection && existingConnection.readyState === existingConnection.OPEN;
    }

    getConnectionState(key: string): WsConnectionState {
        return this.get(key, true)!.connectionState!;
    }

    setConnectionState(key: string, state: WsConnectionState) {
        this.get(key, true)!.connectionState = state;
    }

    isConnectionState(key: string, state: WsConnectionState): boolean {
        return this.getConnectionState(key) === state;
    }

    /* subscribed topics */

    getTopics(key: string): WsTopicList {
        return this.get(key, true)!.subscribedTopics;
    }

    getVerifiedTopics(key: string): WsVerifiedTopicList {
        return this.get(key, true)!.verifiedTopics;
    }

    getVerifiedTopic(key: string, topicKey: string | number): KnownToken | undefined {
        return this.getVerifiedTopics(key)[topicKey];
    }

    getTopicsByKey(): KeyedWsTopicLists {
        const result = {};
        for (const refKey in this.wsState) {
            // @ts-ignore
            result[refKey] = this.getTopics(refKey);
        }
        return result;
    }

    // Since topics are objects we can't rely on the set to detect duplicates
    getMatchingTopic(key: string, topic: WsTopic): any {
        if (typeof topic === "string") {
            return this.getMatchingTopic(key, { channel: topic });
        }

        const allTopics = this.getTopics(key).values();
        for (const storedTopic of allTopics) {
            if (isDeepObjectMatch(topic, storedTopic)) {
                return storedTopic;
            }
        }
    }

    addTopic(key: string, topic: WsTopic): any {
        if (typeof topic === "string") {
            return this.addTopic(key, { channel: topic });
        }
        if (this.getMatchingTopic(key, topic)) {
            return this.getTopics(key);
        }
        return this.getTopics(key).add(topic);
    }

    // helpful if you want match a topic after subscribing
    // eg bitfinex returns a channelId
    verifySubscription(key: string, topicKey: string | number, token: KnownToken): any {
        this.get(key, true)!.verifiedTopics[topicKey] = token;
    }

    deleteTopic(key: string, topic: WsTopic): any {
        const storedTopic = this.getMatchingTopic(key, topic);
        if (storedTopic) {
            this.getTopics(key).delete(storedTopic);
        }

        return this.getTopics(key);
    }
}
