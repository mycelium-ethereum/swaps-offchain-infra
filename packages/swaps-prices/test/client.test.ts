import * as SocketService from "../src/services/swapsSocket";
import ws from "ws";

const { startPingingConnectedClients, connectedClients } = SocketService;

import { startServer, waitForHealthCheck, waitForSocketState } from "./clientTestUtils";
import { parseRawWsMessage } from "./clientTestUtils";

const port = 3000;
let server: any;

beforeEach(async () => {
    server = await startServer(port);
    jest.useFakeTimers();
});

afterEach(async () => {
    jest.useRealTimers();
    await server.close();
    connectedClients.clear();
});

describe("Connected clients", () => {
    test("Connects clients", async () => {
        const client = new ws(`ws://localhost:${port}`);
        jest.useRealTimers();
        await waitForSocketState(client, client.OPEN);
        jest.useFakeTimers();

        expect(Array.from(connectedClients.values()).length).toEqual(1);

        const client2 = new ws(`ws://localhost:${port}`);
        jest.useRealTimers();
        await waitForSocketState(client2, client2.OPEN);
        jest.useFakeTimers();
        expect(Array.from(connectedClients.values()).length).toEqual(2);

        client.close();
        client2.close();

        jest.useRealTimers();
        await Promise.all([
            await waitForSocketState(client, client.CLOSED),
            await waitForSocketState(client2, client2.CLOSED),
        ]);
    });

    test("Closing unresponsive clients", async () => {
        const client = new ws(`ws://localhost:${port}`);
        jest.useRealTimers();
        await waitForSocketState(client, client.OPEN);
        jest.useFakeTimers();

        const client2 = new ws(`ws://localhost:${port}`);
        jest.useRealTimers();
        await waitForSocketState(client2, client2.OPEN);
        jest.useFakeTimers();

        Array.from(connectedClients.values()).forEach((client_) => {
            expect(client_.isAlive).toEqual(true);
        });

        jest.useFakeTimers();
        const pingConnectedClients = startPingingConnectedClients(5000);
        jest.advanceTimersByTime(5000);

        Array.from(connectedClients.values()).forEach((client_) => {
            expect(client_.isAlive).toEqual(false);
        });

        jest.advanceTimersByTime(5000);

        Array.from(connectedClients.values()).forEach((client_) => {
            expect(client_.isAlive).toEqual(false);
        });

        jest.advanceTimersByTime(10000);

        // client will fail to send pong so should close connection
        jest.useRealTimers();
        await Promise.all([
            await waitForSocketState(client, client.CLOSED),
            await waitForSocketState(client2, client2.CLOSED),
        ]);
        expect(Array.from(connectedClients.values()).length).toEqual(0);

        clearInterval(pingConnectedClients);
    });

    test("Keeps connections open", async () => {
        const client = new ws(`ws://localhost:${port}`);
        let clientKey: any;
        client.onmessage = (event: any) => {
            const msg = parseRawWsMessage(event);
            if (msg.t === "connected") {
                clientKey = msg.id;
            }
        };
        jest.useRealTimers();
        await waitForSocketState(client, client.OPEN);

        const spy = jest.spyOn(SocketService, "checkClients");

        SocketService.checkClients();

        client.ping();
        // connnection is kept alive
        await waitForHealthCheck(connectedClients.get(clientKey), true);
        expect(connectedClients.get(clientKey).isAlive).toEqual(true);
        expect(spy.mock.calls.length).toEqual(1);

        SocketService.checkClients();

        expect(connectedClients.get(clientKey).isAlive).toEqual(false);
        expect(spy.mock.calls.length).toEqual(2);

        SocketService.checkClients();

        // client will fail to send pong so should close connection
        await waitForSocketState(client, client.CLOSED);
        expect(Array.from(connectedClients.values()).length).toEqual(0);
    });
});
