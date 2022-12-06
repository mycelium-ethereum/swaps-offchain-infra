import { ethers } from "ethers";
import ws from "ws";
import { parseRawWsMessage } from "./clientTestUtils";
// const client = new ws('ws://localhost:3030');
const client = new ws("wss://pricing.mycelium.xyz");

client.on("open", () => {
    console.log("Connectioned opened");
});

client.on("close", () => {
    console.log("Connection closed");
});

client.onmessage = (message) => {
    const msg = parseRawWsMessage(message);
    if (msg.t !== "update") {
        return;
    }
    const lastPrice = ethers.BigNumber.from(msg.l);
    const newPrice = ethers.BigNumber.from(msg.p);
    const delta = lastPrice.sub(newPrice).abs();
    const diff = delta.mul(ethers.utils.parseEther("1")).div(lastPrice).mul(100);

    console.log(`Received update`, {
        ...msg,
        difference: `${ethers.utils.formatEther(diff)}%`,
    });
};

// server requires a heartbeat every 60 seconds to keep connection alive
setInterval(() => {
    console.log("Sending heartbeat");
    client.ping();
}, 5000);
