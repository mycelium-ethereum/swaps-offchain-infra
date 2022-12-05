import WebSocket from "ws";
import { TypedEmitter } from "tiny-typed-emitter";
import {
    isWsPong,
    WSClientConfigurableOptions,
    WebsocketClientOptions,
    parseRawWsMessage,
    getWsSubscribeMessage,
    getWsUnsubscribeMessage,
    isUpdateMessage,
    parseUpdateMessage,
    getWsPingMessage,
    isSubscriptionResponse,
    getSubscriptionInfo,
    isHeartBeatMessage,
    getWsHeartBeatMessage,
} from "./wsMessages";
import WsStore from "./wsStore";
import type { WsUpdate, WsTopic, WsKey } from "../types";
import { logger } from "../utils/logger";

export const READY_STATE_INITIAL = 0;
export const READY_STATE_CONNECTING = 1;
export const READY_STATE_CONNECTED = 2;
export const READY_STATE_CLOSING = 3;
export const READY_STATE_RECONNECTING = 4;

export enum WsConnectionState {
    READY_STATE_INITIAL,
    READY_STATE_CONNECTING,
    READY_STATE_CONNECTED,
    READY_STATE_CLOSING,
    READY_STATE_RECONNECTING,
}

interface WebsocketEvents {
    open: ({ wsKey, event }: { wsKey: string; event: any }) => void;
    reconnected: ({ wsKey, event }: { wsKey: string; event: any }) => void;
    response: (response: any) => void;
    error: ({ error, wsKey, type, event }: { wsKey: string; error: any; type: string; event?: any }) => void;
    update: (response: WsUpdate) => void;
    reconnect: () => void;
    close: () => void;
}

export class WebsocketClient extends TypedEmitter<WebsocketEvents> {
    options: WebsocketClientOptions;
    public wsStore: WsStore;
    private wsKey: WsKey;

    constructor(key: WsKey, options: WSClientConfigurableOptions) {
        super();

        this.wsStore = new WsStore();
        this.wsKey = key;

        this.options = {
            pongTimeout: 7500,
            pingInterval: 10000,
            reconnectTimeout: 500,
            reconnectOnClose: true,
            ...options,
        };
    }

    public isLivenet(): boolean {
        return true;
    }

    /**
     * Add topic/topics to WS subscription list
     */
    public subscribe(wsTopics: WsTopic[] | WsTopic) {
        const mixedTopics = Array.isArray(wsTopics) ? wsTopics : [wsTopics];
        const topics = mixedTopics.map((topic) => {
            return typeof topic === "string" ? { channel: topic } : topic;
        });

        topics.forEach((topic) => this.wsStore.addTopic(this.getWsKeyForTopic(topic), topic));

        // attempt to send subscription topic per websocket
        this.wsStore.getKeys().forEach((wsKey) => {
            // if connected, send subscription request
            if (this.wsStore.isConnectionState(wsKey, READY_STATE_CONNECTED)) {
                return this.requestSubscribeTopics(wsKey, topics);
            }

            // start connection process if it hasn't yet begun. Topics are automatically subscribed to on-connect
            if (
                !this.wsStore.isConnectionState(wsKey, READY_STATE_CONNECTING) &&
                !this.wsStore.isConnectionState(wsKey, READY_STATE_RECONNECTING)
            ) {
                return this.connect(wsKey);
            }
        });
    }

    /**
     * Remove topic/topics from WS subscription list
     */
    public unsubscribe(wsTopics: WsTopic[] | WsTopic) {
        const mixedTopics = Array.isArray(wsTopics) ? wsTopics : [wsTopics];
        const topics = mixedTopics.map((topic) => {
            return typeof topic === "string" ? { channel: topic } : topic;
        });

        topics.forEach((topic) => this.wsStore.deleteTopic(this.getWsKeyForTopic(topic), topic));

        this.wsStore.getKeys().forEach((wsKey) => {
            // unsubscribe request only necessary if active connection exists
            if (this.wsStore.isConnectionState(wsKey, READY_STATE_CONNECTED)) {
                this.requestUnsubscribeTopics(wsKey, topics);
            }
        });
    }

    public close(wsKey: string) {
        logger.info("Closing connection", { wsKey });
        this.setWsState(wsKey, READY_STATE_CLOSING);
        this.clearPingTimer(wsKey);
        this.clearPongTimer(wsKey);

        this.getWs(wsKey)?.close();
    }

    /**
     * Request connection of all dependent websockets, instead of waiting for automatic connection by library
     */
    public connectAll(): Promise<WebSocket | undefined>[] | undefined {
        return [this.connect(this.wsKey)];
    }

    async connect(wsKey: string): Promise<WebSocket | undefined> {
        try {
            if (this.wsStore.isWsOpen(wsKey)) {
                logger.error("Refused to connect to ws with existing active connection", { wsKey });
                return this.wsStore.getWs(wsKey);
            }

            if (this.wsStore.isConnectionState(wsKey, READY_STATE_CONNECTING)) {
                logger.error("Refused to connect to ws, connection attempt already active", { wsKey });
                return;
            }

            if (!this.wsStore.getConnectionState(wsKey) || this.wsStore.isConnectionState(wsKey, READY_STATE_INITIAL)) {
                this.setWsState(wsKey, READY_STATE_CONNECTING);
            }

            const url = this.options.wsUrl;
            const ws = this.connectToWsUrl(url, wsKey);

            return this.wsStore.setWs(wsKey, ws);
        } catch (err) {
            this.parseWsError("Connection failed", err, wsKey);
            this.reconnectWithDelay(wsKey, this.options.reconnectTimeout!);
            this.emit("error", {
                error: err,
                wsKey,
                type: "CONNECTION_FAILED",
            });
            return undefined;
        }
    }

    parseWsError(context: string, error: any, wsKey: string) {
        const logContext = { wsKey, error };
        if (!error.message) {
            logger.error(`${context} due to unexpected error: `, logContext);
            return;
        }

        switch (error.message) {
            case "Unexpected server response: 401":
                logger.error(`${context} due to 401 authorization failure.`, logContext);
                break;

            default:
                logger.error(
                    `${context} due to unexpected response error: ${error?.msg || error?.message || error}`,
                    logContext
                );
                break;
        }
    }

    reconnectWithDelay(wsKey: string, connectionDelayMs: number) {
        this.clearPingTimer(wsKey);
        this.clearPongTimer(wsKey);

        if (this.wsStore.getConnectionState(wsKey) !== READY_STATE_CONNECTING) {
            this.setWsState(wsKey, READY_STATE_RECONNECTING);
        }

        setTimeout(() => {
            logger.info("Reconnecting to websocket", { wsKey });
            this.connect(wsKey);
        }, connectionDelayMs);
    }

    ping(wsKey: string) {
        const pingMessage = getWsPingMessage(wsKey);
        if (!pingMessage) {
            // dont need to send ping
            return;
        }

        this.clearPongTimer(wsKey);

        logger.debug("Sending ping", { wsKey });
        this.tryWsSend(wsKey, JSON.stringify(pingMessage));

        this.wsStore.get(wsKey, true)!.activePongTimer = setTimeout(() => {
            logger.info("Pong timeout - clearing timers & closing socket to reconnect", { wsKey });
            this.clearPingTimer(wsKey);
            this.clearPongTimer(wsKey);
            this.getWs(wsKey)?.close();
        }, this.options.pongTimeout);
    }

    // Send a ping at intervals
    clearPingTimer(wsKey: string) {
        const wsState = this.wsStore.get(wsKey);
        if (wsState?.activePingTimer) {
            clearInterval(wsState.activePingTimer);
            wsState.activePingTimer = undefined;
        }
    }

    // Expect a pong within a time limit
    clearPongTimer(wsKey: string) {
        const wsState = this.wsStore.get(wsKey);
        if (wsState?.activePongTimer) {
            clearTimeout(wsState.activePongTimer);
            wsState.activePongTimer = undefined;
        }
    }

    /**
     * Send WS message to subscribe to topics.
     */
    requestSubscribeTopics(wsKey: string, topics: WsTopic[]) {
        topics.forEach((topic) => {
            const wsMessage = JSON.stringify({
                ...getWsSubscribeMessage(wsKey),
                ...topic,
            });
            this.tryWsSend(wsKey, wsMessage);
        });
    }

    /**
     * Send WS message to unsubscribe from topics.
     */
    requestUnsubscribeTopics(wsKey: string, topics: WsTopic[]) {
        topics.forEach((topic) => {
            const wsMessage = JSON.stringify({
                ...getWsUnsubscribeMessage(wsKey),
                ...topic,
            });
            this.tryWsSend(wsKey, wsMessage);
        });
    }

    tryWsSend(wsKey: string, wsMessage: string) {
        try {
            logger.debug(`Sending upstream ws message: `, { wsMessage, wsKey });
            if (!wsKey) {
                throw new Error("Cannot send message due to no known websocket for this wsKey");
            }
            this.getWs(wsKey)?.send(wsMessage);
        } catch (e) {
            logger.error(`Failed to send WS message`, {
                wsMessage,
                wsKey,
                exception: e,
            });
        }
    }

    connectToWsUrl(url: string, wsKey: string): WebSocket {
        logger.info(`Opening WS connection to URL: ${url}`, { wsKey });

        const ws = new WebSocket(url);
        ws.onopen = (event) => this.onWsOpen(event, wsKey);
        ws.onmessage = (event) => this.onWsMessage(event, wsKey);
        ws.onerror = (event) => this.onWsError(event, wsKey);
        ws.onclose = (event) => this.onWsClose(event, wsKey);
        ws.on("ping", (event) => {
            ws.pong();
            this.onPing(event, wsKey);
        });

        return ws;
    }

    onPing(_event: any, _wsKey: string) {
        // extra optional ping handling
    }

    async onWsOpen(event: any, wsKey: string) {
        if (this.wsStore.isConnectionState(wsKey, READY_STATE_CONNECTING)) {
            logger.info("Websocket connected", {
                wsKey,
                livenet: this.isLivenet(),
            });
            this.emit("open", { wsKey, event });
        } else if (this.wsStore.isConnectionState(wsKey, READY_STATE_RECONNECTING)) {
            logger.info("Websocket reconnected", { wsKey });
            this.emit("reconnected", { wsKey, event });
        }

        this.setWsState(wsKey, READY_STATE_CONNECTED);

        this.requestSubscribeTopics(wsKey, [...this.wsStore.getTopics(wsKey)]);

        this.wsStore.get(wsKey, true)!.activePingTimer = setInterval(() => this.ping(wsKey), this.options.pingInterval);
    }

    onWsMessage(event: any, wsKey: string) {
        try {
            this.clearPongTimer(wsKey);
            const msg = parseRawWsMessage(event);
            if (isSubscriptionResponse(wsKey, msg)) {
                const subInfo = getSubscriptionInfo(wsKey, msg);
                this.wsStore.verifySubscription(wsKey, subInfo.key, subInfo.token);
            } else if (isUpdateMessage(wsKey, msg, this.wsStore.getVerifiedTopics(wsKey))) {
                logger.debug(`${wsKey}: update message received`, msg);
                const updateMessage = parseUpdateMessage(wsKey, msg, this.wsStore.getVerifiedTopics(wsKey));
                this.emit("update", updateMessage);
            } else if (isHeartBeatMessage(wsKey, msg)) {
                const heartBeatMessage = getWsHeartBeatMessage(wsKey, msg);
                if (heartBeatMessage) {
                    this.tryWsSend(wsKey, JSON.stringify(heartBeatMessage));
                }
            } else {
                logger.debug("Websocket event: ", event.data || event);
                this.onWsMessageResponse(msg, wsKey);
            }
        } catch (error) {
            logger.debug("Parsing message exception: ", event);
            this.emit("error", { wsKey, error, type: "ON_WS_MESSAGE" });
        }
    }

    onWsError(error: any, wsKey: string) {
        this.parseWsError("Websocket error", error, wsKey);
        if (this.wsStore.isConnectionState(wsKey, READY_STATE_CONNECTED)) {
            this.emit("error", { error, wsKey, type: "ON_WS_ERROR" });
        }
    }

    onWsClose(_event: any, wsKey: string) {
        logger.info(`${wsKey} websocket connection closed`, { wsKey });

        if (this.wsStore.getConnectionState(wsKey) !== READY_STATE_CLOSING && this.options.reconnectOnClose) {
            this.reconnectWithDelay(wsKey, this.options.reconnectTimeout!);
            this.emit("reconnect");
        } else {
            this.setWsState(wsKey, READY_STATE_INITIAL);
            this.emit("close");
        }
    }

    onWsMessageResponse(response: any, wsKey: string) {
        if (isWsPong(response)) {
            logger.debug("Received pong", { wsKey });
            this.clearPongTimer(wsKey);
        } else {
            this.emit("response", response);
        }
    }

    getWs(wsKey: string) {
        return this.wsStore.getWs(wsKey);
    }

    setWsState(wsKey: string, state: WsConnectionState) {
        this.wsStore.setConnectionState(wsKey, state);
    }

    getWsKeyForTopic(topic: any) {
        return this.wsKey;
    }
}
