import { createLogger, transports, format } from "winston";
const { combine, errors, timestamp, json } = format;

const logLevels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
};

const logger = createLogger({
    levels: logLevels,
    format: combine(errors({ stack: true }), timestamp(), json()),
    transports: [
        new transports.Console(),

        new transports.File({ filename: "error.log", level: "error" }),
        new transports.File({ filename: "combined.log" }),
    ],
    exceptionHandlers: [new transports.Console({ consoleWarnLevels: ["error"] })],
    rejectionHandlers: [new transports.Console({ consoleWarnLevels: ["error"] })],
});

export { logger };
