import dotenv from "dotenv";

dotenv.config({ path: "./.env" });
dotenv.config({ path: "./.secrets" });

import express, { ErrorRequestHandler } from "express";
import { json as jsonBodyParser } from "body-parser";
import cors from "cors";
import { priceRouter } from "./routes";
import { startWebsocketServer, subscribeWsFeeds, startPingingConnectedClients } from "./services";

const app = express();
const port = process.env.PORT || 3030;

app.use(jsonBodyParser());
app.use(cors());

app.use("/", priceRouter);

app.get("/", (_req, res) => {
    res.status(200).send({ message: "healthy" });
});

const isProd = () => process.env.NODE_ENV === "prod";

/* eslint-disable  @typescript-eslint/no-unused-vars */
// the unused vars in the function signature are required
// to make express use this as error handling middleware
const fallbackErrorHandler: ErrorRequestHandler = function (error, req, res, _next) {
    /* eslint-enable  @typescript-eslint/no-unused-vars */
    console.error("Caught Unhandled Error:", error.stack);
    console.error(
        "Request:",
        JSON.stringify(
            {
                headers: req.headers,
                protocol: req.protocol,
                url: req.url,
                method: req.method,
                body: req.body,
                cookies: req.cookies,
                ip: req.ip,
            },
            null,
            2
        )
    );
    if (isProd()) {
        res.status(500).send({ message: "Unhandled Error" });
    } else {
        res.status(500).send({ message: "Unhandled Error", data: error.stack });
    }
};

app.use(fallbackErrorHandler);

// The 404 Route (ALWAYS Keep this as the last route)
app.use(function (_req, res) {
    res.status(404).send("Not Found");
});

const main = async () => {
    const server = app.listen(port, () => {
        console.log(`Tracer API listening on port ${port}`);
    });

    startWebsocketServer(server);
    subscribeWsFeeds();
    startPingingConnectedClients();
};

main().catch((error) => {
    console.error("Failed to initialise app", error);
    process.exit(1);
});
