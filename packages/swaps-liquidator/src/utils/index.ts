import { Provider } from "@ethersproject/providers";

export const checkProviderHealth = async (provider: Provider) => {
    try {
        const block = await provider.getBlock("latest");
        return block.number > 0;
    } catch (err) {
        return false;
    }
};

export const asyncInterval = ({
    fn,
    delayMs,
    onError,
    onUnavailable,
    runImmediately = false,
}: {
    fn: () => Promise<any>;
    delayMs: number;
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
