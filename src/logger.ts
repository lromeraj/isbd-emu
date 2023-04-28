import colors from "colors"
import winston, { LeveledLogMethod, Logger } from "winston";

interface CustomLogger extends Logger {
  success: LeveledLogMethod,
  setLevel: ( lvl: number | string ) => CustomLogger,
}

let programName = '';

const levels: {
  [key: string]: number
} = {
  error:    0,
  success:  1,
  warn:     2,
  info:     3,
  debug:    4,
}

const levelFormat: {
  [key: string]: string
} = {
  "error":    `[ ${colors.bold.red("ER")} ]`,
  "info":     `[${colors.bold.blue("INFO")}]`,
  "warn":     `[${colors.bold.yellow("WARN")}]`,
  "success":  `[ ${colors.bold.green("OK")} ]`,
  "debug":    `[${colors.bold.magenta("DBUG")}]`,
}

const consoleTransport = new winston.transports.Console({ 
  stderrLevels: [ 'error', 'success', 'warn', 'info', 'debug' ] 
})

const ttyConsoleTransport = new winston.transports.Console({
  stderrLevels: [ 'error' ] 
})


const logger = winston.createLogger({
  level: 'debug',
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
      
      let progNameFormat = '@';

      if ( programName ) {
        progNameFormat = `${ colors.bold( programName ) }`
      }

      let moduleNameFormat = ''

      if ( moduleName ) {
        moduleNameFormat = `${ colors.magenta( moduleName ) }`
      }

      return `${ 
        timestamp 
      } ${ 
        levelFormat[ level ] 
      } ${ 
        progNameFormat 
      } ${ 
        moduleNameFormat 
      }: ${ message } ${
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
  logger.remove( ttyConsoleTransport ).add( consoleTransport );
  return logger;
}

export function setLevel( targetLevel: number | string ) {
  
  let level = 'debug';
  
  if ( typeof targetLevel === 'string' ) {
    level = targetLevel;
  } else {    
    for ( let key in levels ) {
      if ( levels[ key ] === targetLevel ) {
        level = key;
        break;
      }
    }
  }

  logger.level = level;
  
  return logger;
}

export function create( moduleName?: string ) {
  return logger.child({
    moduleName
  }) as CustomLogger;
};

export function setProgramName( name: string ) {
  programName = name;
};

export default logger;