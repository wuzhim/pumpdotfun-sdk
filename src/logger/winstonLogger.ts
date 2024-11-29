const { createLogger, format, transports } = require("winston");

export const logger = createLogger({
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), // 时间精确到毫秒
      format.errors({ stack: true }),
      format.splat(),
      format.json(),
      format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `[${timestamp}] ${level}: ${message}`;
        if (Object.keys(metadata).length) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    ),
    transports: [new transports.Console()],
  });

export default logger;  