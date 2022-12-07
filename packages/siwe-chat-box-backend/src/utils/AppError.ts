import { HttpStatusCode } from "../data/enum/HttpStatusCode";
class BaseError extends Error {
    public readonly name: string;
    public readonly httpCode: HttpStatusCode;
    public readonly isOperational: boolean;
    constructor(name: string, httpCode: HttpStatusCode, description: string, isOperational: boolean) {
        super(description);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = name;
        this.httpCode = httpCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this);
    }
}

class NotFoundError extends BaseError {
    constructor(description: string) {
        super("NotFoundError", HttpStatusCode.NOT_FOUND, description, true);
    }
}

class BadRequestError extends BaseError {
    constructor(description: string) {
        super("BadRequestError", HttpStatusCode.BAD_REQUEST, description, true);
    }
}

class IllegalArgumentError extends BaseError {
    constructor(description: string) {
        super("IllegalArgumentError", HttpStatusCode.INTERNAL_SERVER, description, true);
    }
}

class MissingFieldsError extends BaseError {
    constructor(description: string) {
        super("MissingFieldsError", HttpStatusCode.MISSING_FIELDS, description, true);
    }
}

class ConflictError extends BaseError {
    constructor(description: string) {
        super("ConflictError", HttpStatusCode.CONFLICT, description, true);
    }
}
export { NotFoundError, BadRequestError, IllegalArgumentError, MissingFieldsError, ConflictError, BaseError };
