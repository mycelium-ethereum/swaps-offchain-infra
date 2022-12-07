import express from "express";
import { ConflictError, MissingFieldsError } from "../utils/AppError";
import { ChatboxRepo } from "../models/Repo";
import { HttpStatusCode } from "../data/enum/HttpStatusCode";

export const generateNewNetwork = async (req: express.Request, res: express.Response) => {
    if (!req.body.network) {
        throw new MissingFieldsError("Expected network in request body");
    }

    const existedChatbox = await ChatboxRepo.findOne({
        where: { network: req.body.network },
    });
    if (existedChatbox) {
        throw new ConflictError("Network already existed");
    }

    const createdChatbox = await ChatboxRepo.save({
        network: req.body.network,
    });

    res.status(HttpStatusCode.SUCCESS).json({
        network: createdChatbox.network,
    });
};

export const getListNetworks = async (req: express.Request, res: express.Response) => {
    const chatboxes = await ChatboxRepo.find();
    res.status(HttpStatusCode.SUCCESS).json(chatboxes);
};
