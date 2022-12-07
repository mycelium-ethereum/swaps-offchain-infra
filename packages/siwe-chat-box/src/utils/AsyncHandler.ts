import express from 'express';

const asyncHandler =
	(fn: Function) =>
	(
		req: express.Request,
		res: express.Response,
		next: express.NextFunction,
	) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};

export default asyncHandler;
