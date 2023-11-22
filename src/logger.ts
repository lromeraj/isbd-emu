import path from "path";
import Colors from "colors";
import winston, { Logger } from "winston";

interface CustomLogger extends Logger {
//  success: LeveledLogMethod,
  setLevel: ( lvl: number | string ) => CustomLogger,
}

export const levels: {
  [key: string]: number
} = {
  error:    1,
  warn:     2,
  info:     3,
  debug:    4,
}

const levelFormat: {
  [key: string]: string
} = {
  "error":    `[${Colors.bold.red("ERR")}]`,
  "info":     `[${Colors.bold.blue("INF")}]`,
  "warn":     `[${Colors.bold.yellow("WRN")}]`,
  "debug":    `[${Colors.bold.magenta("DBG")}]`,
}

const consoleTransport = new winston.transports.Console({ 
  stderrLevels: [ 'error', 'warn', 'info', 'debug' ] 
})

const ttyConsoleTransport = new winston.transports.Console({
  stderrLevels: [ 'error' ] 
})

const logger = winston.createLogger({
  level: 'info',
  levels,
  format: winston.format.combine(
    // winston.format.label({ label: 'immoliste' }),
    // winston.format.colorize({ message: true }),
    // winston.format.colorize(),
    winston.format.timestamp({
      // format: 'YYYY-MM-DD HH:mm:ss'
    }),
    // winston.format.align(),

    winston.format.printf( info => {
  
      const {
        timestamp, moduleName, level, message, ...args
      } = info;
      
      // if ( programName ) {
      //   progNameFormat = `${ colors.bold( programName ) }`
      // }

      let moduleNameFormat = ''

      if ( moduleName && logger.level === 'debug' ) {
        moduleNameFormat = ` ${ Colors.magenta( moduleName ) }:`
      }

      return `${
        levelFormat[ level ] 
      }${
        moduleNameFormat
      } ${ message } ${
          Object.keys( args ).length ? JSON.stringify( args, null, 2 ) : ''
      }`;
    
    })  
  ),

  transports: [
    ttyConsoleTransport
  ],

  exitOnError: false

}) as CustomLogger;

export function disableTTY() {
  logger.remove( ttyConsoleTransport )
		.add( consoleTransport );
  return logger;
}

export function setLevel( targetLevel: number | string ) {
  
  let strLevel = 'debug';
  
  if ( typeof targetLevel === 'string' ) {
    strLevel = targetLevel;
  } else {
    for ( let key in levels ) {
      if ( levels[ key ] === targetLevel ) {
        strLevel = key;
        break;
      }
    }
  }

  logger.level = strLevel;
  
  return logger;
}

export function create( moduleName: string ) {
  return logger.child({
    moduleName: path.relative( __filename, moduleName )
  }) as CustomLogger;
};

export default logger;
