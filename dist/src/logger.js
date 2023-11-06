"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setProgramName = exports.create = exports.setLevel = exports.disableTTY = void 0;
const colors_1 = __importDefault(require("colors"));
const winston_1 = __importDefault(require("winston"));
let programName = '';
const levels = {
    error: 0,
    success: 1,
    warn: 2,
    info: 3,
    debug: 4,
};
const levelFormat = {
    "error": `[ ${colors_1.default.bold.red("ER")} ]`,
    "info": `[${colors_1.default.bold.blue("INFO")}]`,
    "warn": `[${colors_1.default.bold.yellow("WARN")}]`,
    "success": `[ ${colors_1.default.bold.green("OK")} ]`,
    "debug": `[${colors_1.default.bold.magenta("DBUG")}]`,
};
const consoleTransport = new winston_1.default.transports.Console({
    stderrLevels: ['error', 'success', 'warn', 'info', 'debug']
});
const ttyConsoleTransport = new winston_1.default.transports.Console({
    stderrLevels: ['error']
});
const logger = winston_1.default.createLogger({
    level: 'debug',
    levels,
    format: winston_1.default.format.combine(
    // winston.format.label({ label: 'immoliste' }),
    // winston.format.colorize({ message: true }),
    // winston.format.colorize(),
    winston_1.default.format.timestamp({
    // format: 'YYYY-MM-DD HH:mm:ss'
    }), 
    // winston.format.align(),
    winston_1.default.format.printf(info => {
        const { timestamp, moduleName, level, message } = info, args = __rest(info, ["timestamp", "moduleName", "level", "message"]);
        let progNameFormat = '@';
        if (programName) {
            progNameFormat = `${colors_1.default.bold(programName)}`;
        }
        let moduleNameFormat = '';
        if (moduleName) {
            moduleNameFormat = `${colors_1.default.magenta(moduleName)}`;
        }
        return `${timestamp} ${levelFormat[level]} ${progNameFormat} ${moduleNameFormat}: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
    })),
    transports: [
        ttyConsoleTransport
    ],
    exitOnError: false
});
function disableTTY() {
    logger.remove(ttyConsoleTransport).add(consoleTransport);
    return logger;
}
exports.disableTTY = disableTTY;
function setLevel(targetLevel) {
    let level = 'debug';
    if (typeof targetLevel === 'string') {
        level = targetLevel;
    }
    else {
        for (let key in levels) {
            if (levels[key] === targetLevel) {
                level = key;
                break;
            }
        }
    }
    logger.level = level;
    return logger;
}
exports.setLevel = setLevel;
function create(moduleName) {
    return logger.child({
        moduleName
    });
}
exports.create = create;
;
function setProgramName(name) {
    programName = name;
}
exports.setProgramName = setProgramName;
;
exports.default = logger;
