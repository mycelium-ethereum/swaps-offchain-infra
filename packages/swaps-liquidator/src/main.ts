require("dotenv").config();
import liquidationHandler from "./api/liquidate";
import mongoose, { MongooseOptions } from "mongoose";
import express from "express";
import { Registry } from "prom-client";
import { resetMetrics, registerMetrics } from "./utils/prometheus";
import { sleep } from "./helpers/helpers";
const app = express();

const INTERVAL = process.env.INTERVAL_MS ? parseInt(process.env.INTERVAL_MS) : 60000;
const IS_PAUSED = process.env.IS_PAUSED === "true";

app.listen(process.env.PORT, async () => {
    console.info("*** Server started on port " + process.env.PORT + " ***");
    resetMetrics();
    await connectDatabase();
    if (!IS_PAUSED) {
        startInterval();
    }
});

const startInterval = async () => {
    console.log(`*** Starting liquidator with interval ${INTERVAL}ms ***`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        await liquidationHandler();
        await sleep(INTERVAL / 1000);
    }
};

const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        } as MongooseOptions);

        console.log("Database connected!");
    } catch (err) {
        console.log("Failed to connect to database!", err);
    }
};

app.get("/", function (_req, res) {
    res.send("Tracer Swaps Liquidator");
});

// Prometheus metrics
const registry = new Registry();
registerMetrics(registry);

app.get("/metrics", async (req, res) => {
    res.setHeader("Content-Type", registry.contentType);
    res.send(await registry.metrics());
});
