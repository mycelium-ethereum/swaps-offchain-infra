import { KnownToken } from "@mycelium-ethereum/swaps-js";
import { ethers } from "ethers";
import * as SocketService from "../src/services/swapsSocket";
const { binanceClient, ftxClient, bitfinexClient } = SocketService;
import priceStore from "../src/services/priceStore";

beforeEach(() => {
    priceStore.clear();
});

// afterEach(() => {
// })

describe("Stores prices", () => {
    test("Storing matching prices", () => {
        binanceClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("1000"),
        });
        expect(Object.keys(priceStore.prices).length).toEqual(1);
        expect(priceStore.prices[KnownToken.ETH]).toBeTruthy();
        expect(Object.keys(priceStore.prices[KnownToken.ETH]).length).toEqual(1);
        expect(priceStore.prices[KnownToken.ETH].binance).toBeTruthy();
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("1000");

        ftxClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("1000"),
        });
        expect(Object.keys(priceStore.prices).length).toEqual(1);
        expect(priceStore.prices[KnownToken.ETH]).toBeTruthy();
        expect(Object.keys(priceStore.prices[KnownToken.ETH]).length).toEqual(2);
        expect(priceStore.prices[KnownToken.ETH].ftx).toBeTruthy();
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("1000");

        bitfinexClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("1000"),
        });
        expect(Object.keys(priceStore.prices).length).toEqual(1);
        expect(priceStore.prices[KnownToken.ETH]).toBeTruthy();
        expect(Object.keys(priceStore.prices[KnownToken.ETH]).length).toEqual(3);
        expect(priceStore.prices[KnownToken.ETH].bitfinex).toBeTruthy();
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("1000");
    });
    test("Storing different prices", () => {
        binanceClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("999"),
        });
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("999");

        ftxClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("1001"),
        });
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("1000");

        bitfinexClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("1000"),
        });
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("1000");
    });
});

describe("Emits median changes", () => {
    test("Catches median changes", () => {
        const spy = jest.spyOn(SocketService, "broadcast");
        binanceClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("999"),
        });
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("999");
        expect(spy.mock.calls.length).toEqual(1);

        ftxClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("1001"),
        });
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("1000");
        expect(spy.mock.calls.length).toEqual(2);

        bitfinexClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("1000"),
        });
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("1000");
        // median price not changed
        expect(spy.mock.calls.length).toEqual(2);

        bitfinexClient.emit("update", {
            knownToken: KnownToken.ETH,
            price: ethers.BigNumber.from("1001"),
        });
        expect(priceStore.medianPrices[KnownToken.ETH].toString()).toEqual("1001");
        expect(spy.mock.calls.length).toEqual(3);

        spy.mockRestore();
    });
});
