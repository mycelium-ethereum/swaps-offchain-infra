import express from "express";
import { UserRepo } from "../models/Repo";
import { ErrorTypes, SiweMessage, generateNonce } from "siwe";
import { HttpStatusCode } from "../data/enum/HttpStatusCode";

export const setNonceSession = async (req: express.Request, res: express.Response) => {
    req.session.nonce = generateNonce();
    res.setHeader("Content-Type", "text/plain");
    res.status(HttpStatusCode.SUCCESS).send(req.session.nonce);
};

export const verifyMsgWithNonceSession = async (req: express.Request, res: express.Response) => {
    try {
        if (!req.body.message) {
            res.status(HttpStatusCode.MISSING_FIELDS).json({
                message: "Expected prepareMessage object as body",
            });
            return;
        }

        const message = new SiweMessage(req.body.message);
        const fields = await message.validate(req.body.signature);

        if (fields.nonce !== req.session.nonce) {
            console.log(req.session);
            res.status(HttpStatusCode.UNAUTHORIZED).json({
                message: `Invalid nonce.`,
            });
            return;
        }

        //* Save address to database
        const existAddress = await UserRepo.findOne({
            where: { address: fields.address },
        });
        if (!existAddress) {
            await UserRepo.save({
                address: fields.address,
            });
        }

        req.session.siwe = fields;
        req.session.cookie.expires = new Date(fields.expirationTime || new Date(Date.now() + 30 * 60 * 1000));

        req.session.save(() => res.status(HttpStatusCode.SUCCESS).end());
    } catch (e: any) {
        req.session.siwe = null;
        req.session.nonce = null;

        console.error(e);

        switch (e) {
            case ErrorTypes.EXPIRED_MESSAGE: {
                req.session.save(() => res.status(HttpStatusCode.LOGIN_TIMEOUT).json({ message: e.message }));
                break;
            }
            case ErrorTypes.INVALID_SIGNATURE: {
                req.session.save(() => res.status(HttpStatusCode.UNPROCESSABLE_ENTITY).json({ message: e.message }));
                break;
            }
            default: {
                req.session.save(() => res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: e.message }));
                break;
            }
        }
    }
};

export const getPersonalInfo = (req: express.Request, res: express.Response) => {
    if (!req.session.siwe) {
        res.status(401).json({ message: "You have to first sign_in" });
        return;
    }

    console.log("User is authenticated!");

    res.setHeader("Content-Type", "text/plain");
    res.send(`You are authenticated and your address is: ${req.session.siwe.address}`);
};
