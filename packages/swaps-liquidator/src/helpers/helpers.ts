import { Contract, ethers } from "ethers";
import colors from "colors";

const GAS_PRICE_ADJUSTMENT = ethers.utils.parseUnits("10", "gwei");
const DEFAULT_GAS_BUFFER = 300000;

const NOT_ENOUGH_FUNDS = "NOT_ENOUGH_FUNDS";
const UNDER_PRICED = "UNDER_PRICED";
const SLIPPAGE = "SLIPPAGE";

const TX_ERROR_PATTERNS = {
    [NOT_ENOUGH_FUNDS]: ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"],
    [UNDER_PRICED]: ["replacement transaction underpriced"],
    [SLIPPAGE]: ["Router: mark price lower than limit", "Router: mark price higher than limit"],
};

type TxOpts = ethers.Overrides & { from?: string | Promise<string> };

export const sendTxn = async (
    txnContract: Contract,
    txnMethod: string,
    txnParams: any[],
    txOptions: TxOpts,
    label: string
) => {
    let retry = 3;
    while (retry > 0) {
        try {
            const txn = await txnContract[txnMethod](...txnParams, txOptions);
            console.info(colors.yellow(`Sending ${label}...`));
            await txn.wait();
            console.info(colors.green("... Sent!"));

            const { gasUsed, transactionHash } = await txnContract.provider.getTransactionReceipt(txn.hash);
            console.info(label + "  orderExecute gas used: ", gasUsed.toString());
            console.info(label + "  orderExecute transaction hash: ", transactionHash);

            return txn;
        } catch (e) {
            console.log("error=" + e);
            const [message, type] = extractError(e);
            switch (type) {
                case NOT_ENOUGH_FUNDS:
                    retry = 0;
                    break;
                case UNDER_PRICED:
                    console.log("Underpriced. Sleep and Retry");
                    await sleep(10);
                    retry--;
                    break;
                case SLIPPAGE:
                    retry = 0;
                    break;
                default:
                    retry = 0;
            }
        }
    }
    return;
};

export const getGasOptions = async (contract: Contract, method: string, params: any[]): Promise<TxOpts> => {
    const txOpts: TxOpts = {};
    txOpts.gasLimit = await getGasLimit(contract, method, params);
    txOpts.gasPrice = await getGasPrice(contract.provider);
    return txOpts;
};

export async function getGasLimit(contract: Contract, method: string, params = []) {
    const defaultGasBuffer = DEFAULT_GAS_BUFFER;
    const gasLimit = await contract.estimateGas[method](...params);
    return gasLimit.add(defaultGasBuffer);
}

export const getGasPrice = async (provider: ethers.providers.Provider) => {
    const gasPrice = await provider.getGasPrice();
    gasPrice.add(GAS_PRICE_ADJUSTMENT);
    return gasPrice;
};

function extractError(ex) {
    if (!ex) {
        return [];
    }
    const message = ex.data?.message || ex.message;
    if (!message) {
        return [];
    }
    for (const [type, patterns] of Object.entries(TX_ERROR_PATTERNS)) {
        for (const pattern of patterns) {
            if (message.includes(pattern)) {
                return [message, type];
            }
        }
    }
    return [message];
}

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const exponentialBackoff = async <T>({
    fn,
    maxRetries = 10,
    shouldRetry,
}: {
    fn: () => Promise<T>;
    shouldRetry: (error: any) => boolean;
    maxRetries: number;
}): Promise<T> => {
    let retries = 0;
    while (true) {
        try {
            return await fn();
        } catch (e) {
            if (!shouldRetry(e)) {
                throw e;
            } else if (retries >= maxRetries) {
                throw e;
            } else {
                console.log(`${new Date().toISOString()}: RETRY #${retries + 1}`);
                console.error(JSON.stringify(e, null, 2));
                retries++;
                await sleep(Math.pow(2, retries));
            }
        }
    }
};

export const retry = async <T>({
    fn,
    maxRetries = 10,
    shouldRetry,
    timeoutSeconds = 10,
}: {
    fn: () => Promise<T>;
    shouldRetry: (error: any) => boolean;
    maxRetries: number;
    timeoutSeconds: number;
}) => {
    let retries = 0;
    while (true) {
        try {
            return await fn();
        } catch (e) {
            if (!shouldRetry(e)) {
                throw e;
            } else if (retries >= maxRetries) {
                throw e;
            } else {
                console.log(`${new Date().toISOString()}: RETRY #${retries + 1}`);
                console.error(JSON.stringify(e, null, 2));
                retries++;
                await sleep(timeoutSeconds);
            }
        }
    }
};
