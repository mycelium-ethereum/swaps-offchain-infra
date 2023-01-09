import { ethers } from "ethers";
import { checkProviderHealth } from "./utils/ethers";
import colors from "colors";
import { syncOrderBook } from "./helpers/syncOrderBook";
import { getOrdersToExecute } from "./helpers/getOrdersToExecute";
import { executeOrders } from "./helpers/executeOrders";
import { upkeepErrors, upkeepCyclesPerformed, ethBalance } from "./prometheus";

export default async function orderBookUpkeep() {
    try {
        console.log(colors.yellow(`STEP 1: Connecting to blockchain`));
        let provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const isProviderHealthy = await checkProviderHealth(provider);
        if (!isProviderHealthy) {
            console.log("Provider is not healthy, using fallback provider");
            provider = new ethers.providers.JsonRpcProvider(process.env.FALLBACK_RPC_URL);
        }

        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const balanceWei = await signer.getBalance();
        const balanceEth = ethers.utils.formatEther(balanceWei);
        ethBalance.set(parseFloat(balanceEth));

        console.log(colors.yellow(`STEP 2: Syncing order book`));
        await syncOrderBook(provider);

        console.log(colors.yellow(`STEP 3: Fetching orders that need to be executed`));
        const orders = await getOrdersToExecute(provider);

        // STEP 5: Execute all orders
        if (orders.total() === 0) {
            console.log(`No orders to execute`);
        } else {
            console.log(`Found ${orders.total()} orders to execute`);
            await executeOrders(orders, signer);
        }

        console.log(colors.green(`Order book upkeep complete`));
        upkeepCyclesPerformed.inc();
    } catch (error) {
        console.log(error);
        // upkeepErrors.inc({ error });
        upkeepErrors.inc();
    }
}
