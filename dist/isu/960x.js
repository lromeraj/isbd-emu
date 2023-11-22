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
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMB = exports.validateMB = exports.computeChecksum = exports.Modem = void 0;
const logger = __importStar(require("../logger"));
const interface_1 = require("../at/interface");
const commands_1 = require("./commands");
const sio = __importStar(require("socket.io-client"));
const log = logger.create(__filename);
;
// TODO: create a parent class named Modem and rename this to SBDModem
class Modem {
    updateCIEV(ciev) {
        Object.assign(this.ciev, ciev);
        if (this.cier.mode) {
            if (this.cier.sigind && ciev.sigq !== undefined) {
                this.at.enqueueLine(`+CIEV:0,${ciev.sigq}`, 'sigq');
            }
            if (this.cier.svcind && ciev.svca !== undefined) {
                this.at.enqueueLine(`+CIEV:1,${ciev.svca}`, 'svca');
            }
        }
    }
    constructor(options) {
        this.moBuffer = {
            buffer: Buffer.alloc(0),
            checksum: 0,
        };
        this.mtBuffer = {
            buffer: Buffer.alloc(0),
            checksum: 0,
        };
        this.at = new interface_1.ATInterface({
            baudRate: 19200,
            path: options.dte.path,
        });
        this.cier = {
            mode: 0,
            sigind: 0,
            svcind: 0, // service indicator
        };
        this.ciev = {
            sigq: 0,
            svca: 0,
        };
        const uri = options.gss.uri
            ? options.gss.uri
            : `ws://${options.gss.host}:${options.gss.port}`;
        this.momsn = 0;
        this.mtmsn = 0;
        this.imei = options.imei || '527695889002193';
        this.at.registerCommands([
            commands_1.CMD_CGSN,
            commands_1.CMD_SBDTC,
            commands_1.CMD_SBDRB,
            commands_1.CMD_SBDWB,
            commands_1.CMD_SBDIX,
            commands_1.CMD_SBDIXA,
            commands_1.CMD_SBDD,
            commands_1.CMD_SBDWT,
            commands_1.CMD_SBDRT,
            commands_1.CMD_CIER,
            commands_1.CMD_SBDMTA,
        ], this);
        this.socket = sio.connect(uri, {
            query: {
                imei: this.imei,
            }
        });
        this.socket.on('connect', () => {
            this.updateCIEV({
                svca: 1,
                sigq: 5,
            });
            log.debug(`GSS reached`);
        });
        this.socket.on('disconnect', () => {
            this.updateCIEV({
                svca: 0,
                sigq: 0,
            });
            log.debug(`GSS lost`);
        });
        this.socket.on('ring', () => {
            this.at.enqueueLine(`SBDRING`, 'ring');
        });
    }
    increaseMOMSN() {
        this.momsn = (this.momsn + 1) & 0xFFFF;
    }
    initSession(opts) {
        return new Promise((resolve, reject) => {
            const sessionReq = {
                imei: this.imei,
                mo: this.moBuffer.buffer,
                momsn: this.momsn,
                alert: opts.alert || false,
            };
            this.socket.timeout(15000).emit('initSession', sessionReq, (err, sessionResp) => {
                if (err) {
                    resolve({
                        mosts: 32,
                        mtsts: 2,
                        momsn: this.momsn,
                        mtmsn: this.mtmsn,
                        mt: Buffer.from([]),
                        mtq: 0
                    });
                }
                else {
                    if (this.moBuffer.buffer.length > 0) {
                        this.increaseMOMSN();
                    }
                    this.mtmsn = sessionResp.mtmsn;
                    if (sessionResp.mtsts === 1) {
                        Modem.updateMobileBuffer(this.mtBuffer, sessionResp.mt);
                    }
                    resolve(sessionResp);
                }
            });
        });
    }
    static clearMobileBuffer(mobBuf) {
        mobBuf.checksum = 0;
        mobBuf.buffer = Buffer.alloc(0);
    }
    static updateMobileBuffer(mobBuf, buffer, checksum) {
        mobBuf.buffer = buffer;
        mobBuf.checksum = checksum === undefined
            ? computeChecksum(buffer)
            : checksum;
    }
}
exports.Modem = Modem;
function computeChecksum(message) {
    let payloadChecksum = 0;
    for (let i = 0; i < message.length; i++) {
        payloadChecksum += message[i];
    }
    return (payloadChecksum & 0xFFFF);
}
exports.computeChecksum = computeChecksum;
/**
 * Checks if the given mobile buffer checksum is valid
 *
 * @param buffer Full message including trailing checksum
 * @param payloadLength The length of the payload (excluding checksum)
 * @returns Checksum validity
 */
function validateMB(mo) {
    return mo.checksum === computeChecksum(mo.buffer);
}
exports.validateMB = validateMB;
/**
 * Reads a mobile buffer from the given AT interface
 *
 * @param at
 * @param payloadLength
 * @returns
 */
function readMB(at, payloadLength) {
    const delimiter = (byte, buf) => buf.length >= payloadLength + 2;
    return at.readRawUntil(delimiter, 60000).then(buffer => ({
        buffer: buffer.subarray(0, payloadLength),
        checksum: buffer.readUInt16BE(payloadLength)
    }));
}
exports.readMB = readMB;
