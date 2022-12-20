require("dotenv").config();
import orderBookUpkeep from "./orderBookUpkeep";
import express from "express";
import mongoose from "mongoose";
import { sleep } from "./utils/time";
import colors from "colors";
import { registerMetrics, resetMetrics } from "./prometheus";
import { Registry } from "prom-client";

const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DB_URL || "";
const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 60 * 1000;
const IS_PAUSED = process.env.IS_PAUSED === "true" ? true : false;

const connectToDB = async () => {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to database!");
    } catch (error) {
        console.log(error);
    }
};

const startInterval = async () => {
    console.log(colors.yellow(`*** STARTING ORDER BOOK INTERVAL ***`));
    let isRunning = false;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (!isRunning) {
            isRunning = true;
            await orderBookUpkeep();
            isRunning = false;
        }
        await sleep(INTERVAL_MS);
    }
};

const app = express();

app.get("/status", (req, res) => {
    res.send("healthy");
});

app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    resetMetrics();
    await connectToDB();
    if (!IS_PAUSED) {
        startInterval();
    }
});

// Prometheus metrics
const registry = new Registry();
registerMetrics(registry);

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
});
