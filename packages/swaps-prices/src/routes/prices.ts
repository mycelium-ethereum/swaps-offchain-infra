import { routeWithErrorHandling } from "@mycelium-ethereum/swaps-js";
import express from "express";
import { rateLimiter } from "./rateLimiter";

import { getPrices } from "../services";

const router = express.Router();

router.get(
    "/prices",
    rateLimiter("getPrices"),
    routeWithErrorHandling(async (req, res) => {
        const { status, body } = await getPrices({
            network: req.query.network,
        });

        res.status(status).send(body);
    })
);

export default router;
