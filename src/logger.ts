import colors from "colors"
import winston, { LeveledLogMethod, Logger } from "winston";

interface CustomLogger extends Logger {
  success: LeveledLogMethod,
}

const config = {

  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    debug: 4,
  },

  levelFormat: {
    "error":    `[ ${colors.bold.red("ER")} ]`,
    "info":     `[${colors.bold.blue("INFO")}]`,
    "warn":     `[${colors.bold.yellow("WARN")}]`,
    "success":  `[ ${colors.bold.green("OK")} ]`,
    "debug":    `[${colors.bold.magenta("DBUG")}]`,
  }

};

const logger = winston.createLogger({
  
  level: "debug",
  levels: config.levels,
  format: winston.format.combine(
    // winston.format.label({ label: 'immoliste' }),
    // winston.format.colorize({ message: true }),
    // winston.format.colorize(),
    winston.format.timestamp({
      // format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.align(),

    winston.format.printf( info => {
  
      const {
        timestamp, level, message, ...args
      } = info;

      // console.log( info[ Symbol.for('splat')] )

      const levelFormat: { [key: string]: string } = config.levelFormat; 
      
      return `${timestamp} ${ levelFormat[ level ] }: ${message} ${ 
        Object.keys( args ).length ? JSON.stringify(args, null, 2) : ''
      }`;
    
    })  
  ),
  transports: [
    new winston.transports.Console()
  ],
  exitOnError: false
}) as CustomLogger;

export default logger;