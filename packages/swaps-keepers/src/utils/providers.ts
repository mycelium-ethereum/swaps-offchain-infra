require("dotenv").config();

import { ethers } from "ethers";
import { createProvider, attemptPromiseRecursively, delay, logger } from "@mycelium-ethereum/swaps-js";

const fallbackRPC = process.env.FALLBACK_RPC_URL;
export const fallbackProvider = fallbackRPC ? createProvider(fallbackRPC) : undefined;

export const callContract = async (contract: ethers.Contract, fn: string, txnParams: any[], label: string) => {
    let result;
    try {
        logger.info(`Calling ${label}, promise will timeout after 3 seconds`);
        result = attemptPromiseRecursively({
            promise: () => contract[fn](...txnParams),
            timeout: 3000,
            timeoutMessage: `${label} call timed out after 3 seconds`,
        });
        return result;
    } catch (error) {
        logger.error(`Failed calling ${label}`, { error });
        if (fallbackProvider) {
            logger.info(`Trying ${label} with fallback provider, promise will timeout after 3 seconds`);
            try {
                const fallbackContract = contract.connect(fallbackProvider);
                result = attemptPromiseRecursively({
                    promise: () => fallbackContract[fn](...txnParams),
                    timeout: 3000,
                    timeoutMessage: `Fallback ${label} call timed out after 3 seconds`,
                });
                return result;
            } catch (error) {
                logger.info(`${label} failed with fallback provider`);
                throw error;
            }
        } else {
            logger.warn(`No fallback provider set to retry ${label}`);
        }
        throw error;
    }
};

const EXPECTED_PONG_BACK = 15000;
// every 15 seconds
const KEEP_ALIVE_CHECK_INTERVAL = 15000;

/**
 * Set an onClose event listener on the providers websocket
 * Modified version of code recommended by Quicknode https://github.com/ethers-io/ethers.js/issues/1053#issuecomment-808736570
 * https://support.quicknode.com/hc/en-us/articles/9422611596305-Handling-Websocket-Drops-and-Disconnections
 */
export const handleClosedConnection = (
    wsProvider_: ethers.providers.WebSocketProvider,
    handleClosedConnection: (newProvider: ethers.providers.WebSocketProvider) => any
) => {
    const url = wsProvider_.connection.url;
    let wsProvider: ethers.providers.WebSocketProvider = wsProvider_;

    let pingTimeout: any = null;
    let keepAliveInterval: any = null;

    const init = () => {
        const startPinging = () => {
            keepAliveInterval = setInterval(() => {
                logger.info(
                    `Checking if the connection is alive with ping, will close the connection after ${EXPECTED_PONG_BACK}ms`,
                    { url }
                );

                wsProvider._websocket.ping();

                // Use `WebSocket#terminate()`, which immediately destroys the connection,
                // instead of `WebSocket#close()`, which waits for the close timer.
                // Delay should be equal to the interval at which your server
                // sends out pings plus a conservative assumption of the latency.
                pingTimeout = setTimeout(() => {
                    wsProvider._websocket.terminate();
                }, EXPECTED_PONG_BACK);
            }, KEEP_ALIVE_CHECK_INTERVAL);
        };
        if (wsProvider._wsReady) {
            startPinging();
        }
        wsProvider._websocket.on("open", () => {
            startPinging();
        });

        wsProvider._websocket.on("pong", () => {
            logger.info(`Received pong within ${EXPECTED_PONG_BACK}ms, so connection is alive, clearing the timeout`, {
                url,
            });
            clearInterval(pingTimeout);
        });

        wsProvider._websocket.on("close", async (code: any) => {
            logger.error("The websocket provider connection was closed", {
                code,
                url,
            });
            clearInterval(keepAliveInterval);
            clearTimeout(pingTimeout);
            wsProvider._websocket.terminate();
            delay(3000); // wait before reconnect
            wsProvider = new ethers.providers.WebSocketProvider(url);
            handleClosedConnection(wsProvider);
            init();
        });
    };
    init();
};
