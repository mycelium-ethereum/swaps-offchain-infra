import { HttpStatusCode } from '../data/enum/HttpStatusCode';
import { BaseError } from '../utils/AppError';

const errorHandler = (err: any, req: any, res: any, next: any) => {
	if (err instanceof BaseError) {
		res.status(err.httpCode).json({
			message: err.message,
		});
	} else {
		res.status(HttpStatusCode.INTERNAL_SERVER).json({
			message: 'Internal server error',
		});
	}
};

export default errorHandler;
