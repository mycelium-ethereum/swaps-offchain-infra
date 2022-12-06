import { ethers } from "ethers";

export const calcMedian = (a: ethers.BigNumber[]): ethers.BigNumber => {
    if (a.length === 0) {
        return ethers.BigNumber.from(0);
    }

    const sortedArray = a.sort((a, b) => {
        const diff = a.sub(b);
        if (diff.gt(0)) {
            return -1;
        } else if (diff.lt(0)) {
            return 1;
        } else {
            return 0;
        }
    });
    const half = Math.floor(a.length / 2);

    if (a.length % 2) return sortedArray[half];
    return sortedArray[half - 1].add(sortedArray[half]).div(2);
};

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const asyncInterval = ({
    fn,
    delayMs,
    onError,
    onUnavailable,
    runImmediately = false,
}: {
    // eslint-disable-next-line
    fn: () => Promise<any>;
    delayMs: number;
    // eslint-disable-next-line
    onError?: (error: Error) => any;
    onUnavailable?: () => void;
    runImmediately?: boolean;
}) => {
    // create a lock to prevent promises backing up
    // if they run longer than provided delay
    // unavailable by default until initial call to `fn` completes
    let isAvailable = !runImmediately;

    if (runImmediately) {
        // attempt first call immediately
        // and then set lock available
        fn()
            .then(() => {
                // set lock to be available
                isAvailable = true;
            })
            .catch((error) => {
                isAvailable = true;
                onError?.(error);
            });
    }

    const interval = setInterval(async () => {
        if (isAvailable) {
            try {
                isAvailable = false;
                await fn();
                isAvailable = true;
                // eslint-disable-next-line
            } catch (error: any) {
                onError?.(error);
                isAvailable = true;
            }
        } else {
            onUnavailable?.();
        }
    }, delayMs);

    return interval;
};

export const timeoutError = Symbol("Timeout error");
/**
 * attempt promise until it succeeds or the maximum number of allowed attempts is reached
 *
 * @returns a promise that will eventually error or resolve to the same type as the original promise
 */
export const attemptPromiseRecursively = async <T>({
    promise,
    retryCheck,
    maxAttempts = 3,
    interval = 1000,
    timeout = 10000,
    attemptCount = 1,
    timeoutMessage,
}: {
    promise: () => Promise<T>;
    retryCheck?: (error: unknown) => Promise<boolean>;
    maxAttempts?: number;
    interval?: number;
    timeout?: number;
    attemptCount?: number;
    timeoutMessage?: string;
}): Promise<T> => {
    try {
        const result = await timeoutPromise(promise(), timeout, timeoutMessage);
        return result;
    } catch (error: unknown) {
        if (error === timeoutError) {
            // timeout throw straight away
            throw new Error(timeoutMessage ?? `Promise timed out whilst attempting recursively`);
        }
        if (attemptCount >= maxAttempts) {
            throw error;
        }

        await delay(interval);

        if (!retryCheck || (retryCheck && (await retryCheck(error)))) {
            return attemptPromiseRecursively({
                promise,
                retryCheck,
                interval,
                maxAttempts,
                attemptCount: attemptCount + 1,
            });
        } else {
            throw error;
        }
    }
};

/**
 * Timeout on an arbitrary promise
 * @param prom promise to check
 * @time amount of milliseconds to wait for promise
 */
export const timeoutPromise = async (prom: Promise<any>, time = 10000, errorMessage?: string) => {
    let timer: any;
    return Promise.race([prom, new Promise((_r, rej) => (timer = setTimeout(rej, time, timeoutError)))])
        .finally(() => clearTimeout(timer))
        .catch((error) => {
            if (error === timeoutError && errorMessage) {
                console.error(errorMessage, {
                    duration: time,
                    error: new Error(errorMessage),
                });
            }
            // throw the error on
            throw error;
        });
};
