import * as winston from 'winston';
const { createLogger, format, transports } = winston;

const customTimestampFormat = format((info) => {
    info.timestamp = new Date().toISOString().replace('T', ' | ').slice(0, -5);
    return info;
});

export const logger = createLogger({
    format: format.combine(
        customTimestampFormat(),
        format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                customTimestampFormat(),
                format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
            )
        }),
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' })
    ],
    exceptionHandlers: [
        new transports.File({ filename: 'exceptions.log' })
    ],
    rejectionHandlers: [
        new transports.File({ filename: 'exceptions.log' })
    ]
});