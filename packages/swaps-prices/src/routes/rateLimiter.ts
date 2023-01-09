import type { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimits = [
    {
        key: "getPrices",
        points: 5,
        duration: 1,
    },
] as const;

const rateLimitLookup = rateLimits.reduce((total, current) => {
    total[current.key] = new RateLimiterMemory({
        points: current.points,
        duration: current.duration,
    });

    return total;
}, {} as { [key: string]: RateLimiterMemory });

export const rateLimiter =
    (key: (typeof rateLimits)[number]["key"]) => (req: Request, res: Response, next: NextFunction) => {
        rateLimitLookup[key]
            .consume(req.ip)
            .then(() => {
                next();
            })
            .catch(() => {
                res.status(429).send({ message: "Too Many Requests" });
            });
    };
