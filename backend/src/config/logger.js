const winston = require('winston');
const { SeqTransport } = require('@datalust/winston-seq');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'patrion-iot-backend' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

if (process.env.SEQ_URL) {
    logger.add(new SeqTransport({
        serverUrl: process.env.SEQ_URL,
        apiKey: process.env.SEQ_API_KEY,
        onError: (e) => console.error('Seq Logging Error:', e),
        handleExceptions: true,
        handleRejections: true,
    }));
}

module.exports = logger;