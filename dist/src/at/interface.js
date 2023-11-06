"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATInterface = void 0;
const logger = __importStar(require("../logger"));
const colors_1 = __importDefault(require("colors"));
const serialport_1 = require("serialport");
const cmd_1 = require("./cmd");
const commands_1 = require("./commands");
var ATIStatus;
(function (ATIStatus) {
    ATIStatus[ATIStatus["WAITING"] = 0] = "WAITING";
    ATIStatus[ATIStatus["PROCESSING"] = 1] = "PROCESSING";
})(ATIStatus || (ATIStatus = {}));
;
const log = logger.create('at-interface');
class ATInterface {
    constructor(serialPortOpts) {
        this.commands = [];
        this.status = ATIStatus.WAITING;
        this.echo = false; // TODO: expose echo
        this.quiet = false; // TODO: expose quiet
        this.verbose = true; // TODO: expose verbose
        this.atCmdStr = '';
        this.atCmdMask = 'AT';
        this.requests = [];
        this.requestBuffer = [];
        this.enqueuedLines = {};
        this.sp = new serialport_1.SerialPort({
            path: serialPortOpts.path || '/dev/null',
            baudRate: serialPortOpts.baudRate || 115200,
            autoOpen: typeof serialPortOpts.path === 'string',
        }, err => {
            if (err) {
                log.error(err.message);
            }
            else {
                log.success(`AT Interface ready`);
            }
        });
        this.sp.on('data', (buffer) => {
            if (this.status === ATIStatus.WAITING) {
                // TODO: Considere this possibility
                // if ( this.requestBuffer.length > 0 ) {
                //   this.requestBuffer = Buffer.from([]);
                // }
                this.waitingCommand(buffer);
            }
            else if (this.status === ATIStatus.PROCESSING) {
                this.processingCmd(buffer);
            }
        });
        this.registerCommands([
            commands_1.CMD_AT,
            commands_1.CMD_ECHO,
            commands_1.CMD_QUIET,
            commands_1.CMD_VERBOSE,
            commands_1.CMD_DTR,
            commands_1.CMD_FLOW_CONTROL,
        ]);
    }
    processingCmd(buffer) {
        buffer.forEach(byte => {
            this.requestBuffer.push(byte);
            const currentReq = this.requests[0];
            if (currentReq) {
                if (currentReq.delimiter(byte, this.requestBuffer)) {
                    currentReq.callback(Buffer.from(this.requestBuffer));
                    this.requestBuffer = [];
                    this.requests.shift();
                }
            }
        });
    }
    enqueueLine(str, id) {
        if (this.status == ATIStatus.WAITING) {
            this.writeLine(str);
        }
        else {
            this.enqueuedLines[id] = str;
        }
    }
    waitingCommand(buffer) {
        buffer.forEach(byte => {
            let addByte = true;
            if (this.atCmdStr.length < this.atCmdMask.length) {
                const byteCode = String.fromCharCode(byte).toUpperCase();
                const maskCode = this.atCmdMask.charAt(this.atCmdStr.length);
                if (byteCode !== maskCode) {
                    addByte = false;
                }
            }
            if (addByte) {
                const char = String.fromCharCode(byte);
                this.atCmdStr += char;
                if (this.echo) {
                    this.sp.write(char);
                }
                if (byte === 13) {
                    this.processCommand(this.atCmdStr);
                    this.atCmdStr = '';
                }
            }
        });
    }
    escapeLine(line) {
        return line
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');
    }
    processCommand(atCmdStr) {
        this.status = ATIStatus.PROCESSING;
        for (let cmd of this.commands) {
            const promise = cmd.test(this, atCmdStr);
            if (promise) {
                log.debug(`Processing command: [${colors_1.default.bold.cyan(cmd.fqn.toUpperCase())}] ${colors_1.default.blue(this.escapeLine(atCmdStr))}`);
                promise.then(str => {
                    if (typeof str === 'number') {
                        this.writeStatus(str);
                    }
                    else if (typeof str === 'string') {
                        this.writeLine(str);
                    }
                    else {
                        this.writeStatus(cmd_1.ATCmd.Status.OK);
                    }
                }).catch(err => {
                    // TODO: write AT error response ????
                    log.error(`Internal command error => ${err.stack}`);
                }).finally(() => {
                    this.writeEnqueuedLines();
                    this.status = ATIStatus.WAITING;
                });
                // TODO: we could run over other commands to check ambiguity
                return;
            }
        }
        log.error(`Unknown command: ${colors_1.default.red(this.escapeLine(atCmdStr))}`);
        this.status = ATIStatus.WAITING;
        this.writeStatus(cmd_1.ATCmd.Status.ERR);
    }
    writeEnqueuedLines() {
        for (let key in this.enqueuedLines) {
            this.writeLine(this.enqueuedLines[key]);
        }
        this.enqueuedLines = {};
    }
    getLineStart() {
        return this.verbose ? '\r\n' : '';
    }
    getLineEnd() {
        return this.verbose ? '\r\n' : '\r';
    }
    setFlowControl(flowControl) {
        this.sp.settings.rtscts = flowControl;
    }
    setEcho(echo) {
        this.echo = echo;
    }
    setQuiet(quiet) {
        this.quiet = quiet;
    }
    setVerbose(verbose) {
        this.verbose = verbose;
    }
    readRawUntil(delimiter, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Read timeout'));
            }, timeout);
            this.requests.push({
                delimiter,
                callback: buffer => {
                    clearTimeout(timer);
                    resolve(buffer);
                }
            });
        });
    }
    writeRaw(buffer) {
        this.sp.write(buffer);
        this.sp.drain();
    }
    writeLine(line) {
        log.debug(`Writing line: ${colors_1.default.blue(this.escapeLine(line))}`);
        this.writeRaw(Buffer.from(this.getLineStart() + line + this.getLineEnd()));
    }
    writeLineStart(line) {
        this.writeRaw(Buffer.from(this.getLineStart() + line));
    }
    writeLineEnd(line) {
        this.writeRaw(Buffer.from(line + this.getLineEnd()));
    }
    registerCommand(atCmd, context) {
        if (typeof atCmd === 'function' && context) {
            this.commands.push(atCmd(context));
        }
        else if (atCmd instanceof cmd_1.ATCmd) {
            this.commands.push(atCmd);
        }
    }
    registerCommands(atCmds, context) {
        atCmds.forEach(atCmd => {
            this.registerCommand(atCmd, context);
        });
    }
    // TODO: accept string as parameter too ??
    writeStatus(sts) {
        if (this.quiet)
            return;
        if (sts === cmd_1.ATCmd.Status.OK) {
            this.writeLine(this.verbose ? 'OK' : '0');
        }
        else {
            this.writeLine(this.verbose ? 'ERROR' : '4');
        }
    }
}
exports.ATInterface = ATInterface;
(function (ATInterface) {
    ;
})(ATInterface = exports.ATInterface || (exports.ATInterface = {}));
