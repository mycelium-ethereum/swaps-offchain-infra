import type { Request, Response, NextFunction } from "express";

/**
 * higher order function to wrap express middleware with error handling
 */
export const routeWithErrorHandling =
    (handler: (req: Request, res: Response) => any) => async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res);
        } catch (error) {
            next(error);
        }
    };
