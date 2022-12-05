// webSocketTestUtils.js
import http from "http";
import { startWebsocketServer } from "../src/services";

const startServer = (port: number) => {
    const server = http.createServer();
    startWebsocketServer(server);
    return new Promise((resolve) => {
        server.listen(port, () => resolve(server));
    });
};

const waitForSocketState = (socket: any, state: any) => waitFor(socket, "readyState", state);
const waitForHealthCheck = (socket: any, state: any) => waitFor(socket, "isAlive", state);

const waitFor = (socket: any, type: "readyState" | "isAlive", state: any) => {
    return new Promise(function (resolve) {
        setTimeout(function () {
            if (socket[type] === state) {
                // @ts-ignore
                resolve();
            } else {
                waitFor(socket, type, state).then(resolve);
            }
        }, 5);
    });
};

const delay = (n: number) => {
    return new Promise<void>(function (resolve, _reject) {
        setTimeout(function () {
            resolve();
        }, n);
    });
};

const parseRawWsMessage = (event: any): any => {
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
};

export { startServer, waitForSocketState, waitForHealthCheck, parseRawWsMessage, delay };
