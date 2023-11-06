"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMD_SBDWB = exports.CMD_SBDRB = exports.CMD_SBDWT = exports.CMD_SBDRT = exports.CMD_SBDD = exports.CMD_SBDIXA = exports.CMD_SBDIX = exports.CMD_SBDTC = exports.CMD_SBDMTA = exports.CMD_CIER = exports.CMD_CGSN = void 0;
const sprintf_js_1 = require("sprintf-js");
const cmd_1 = require("../at/cmd");
const _960x_1 = require("./960x");
/**
 * 5.21 +CGSN – Serial Number
 */
exports.CMD_CGSN = cmd_1.ATCmd.wrapContext('+cgsn', cmd => {
    cmd.onExec(function (at) {
        return __awaiter(this, void 0, void 0, function* () {
            at.writeLine(this.imei);
        });
    });
});
/**
 * 5.21 +CGSN – Serial Number
 */
exports.CMD_CIER = cmd_1.ATCmd.wrapContext('+cier', cmd => {
    cmd.onSet(/(\d),(\d),(\d)/, function (at, match) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cier.mode = parseInt(match[1]);
            this.cier.sigind = parseInt(match[2]);
            this.cier.svcind = parseInt(match[3]);
            // this actually enqueues events because we are currently
            // processing a command
            this.updateCIEV(this.ciev);
        });
    });
});
exports.CMD_SBDMTA = cmd_1.ATCmd.wrapContext('+sbdmta', cmd => {
    cmd.onSet(/\d/, function (at, match) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cier.mode = parseInt(match[0]);
        });
    });
});
/**
 * Transfer mobile terminated originated buffer
 * to mobile terminated buffer
 */
exports.CMD_SBDTC = cmd_1.ATCmd.wrapContext('+sbdtc', cmd => {
    cmd.onExec(function (at) {
        return __awaiter(this, void 0, void 0, function* () {
            this.mtBuffer = Object.assign({}, this.moBuffer);
            at.writeLine(`SBDTC: Outbound SBD Copied to Inbound SBD: size = ${this.moBuffer.buffer.length}`);
        });
    });
});
function writeExtSessionResp(at, sessionResp) {
    const resp = (0, sprintf_js_1.sprintf)('%s:%d,%d,%d,%d,%d,%d', '+SBDIX', sessionResp.mosts, sessionResp.momsn, sessionResp.mtsts, sessionResp.mtmsn, sessionResp.mt.length, sessionResp.mtq);
    at.writeLine(resp);
}
/**
 * 5.38 +SBDIX – Short Burst Data: Initiate an SBD Session Extended
 */
exports.CMD_SBDIX = cmd_1.ATCmd.wrapContext('+sbdix', cmd => {
    cmd.onExec(function (at) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.initSession({ alert: false }).then(session => {
                writeExtSessionResp.apply(this, [at, session]);
            });
        });
    });
});
exports.CMD_SBDIXA = cmd_1.ATCmd.wrapContext('+sbdixa', cmd => {
    cmd.onExec(function (at) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.initSession({ alert: true }).then(session => {
                writeExtSessionResp.apply(this, [at, session]);
            });
        });
    });
});
/**
 * 5.42 +SBDD – Short Burst Data: Clear SBD Message Buffer(s)
 */
exports.CMD_SBDD = cmd_1.ATCmd.wrapContext('+sbdd', cmd => {
    cmd.onExec(/^[012]$/, function (at, [opt]) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = {
                OK: '0',
                ERR: '1',
            };
            if (opt === '0') {
                _960x_1.Modem.clearMobileBuffer(this.moBuffer);
            }
            else if (opt === '1') {
                _960x_1.Modem.clearMobileBuffer(this.mtBuffer);
            }
            else if (opt === '2') {
                _960x_1.Modem.clearMobileBuffer(this.moBuffer);
                _960x_1.Modem.clearMobileBuffer(this.mtBuffer);
            }
            at.writeLine(code.OK);
        });
    });
});
// 5.34 +SBDRT – Short Burst Data: Read a Text Message from the Module
// ! Iridium has a mistake in their manual (or in the implementation)
// ! The modem should respond with  +SBDRT:<CR>{MT buffer}
// ! but it is responding with      +SBDRT:<CR><LN>{MT buffer}
exports.CMD_SBDRT = cmd_1.ATCmd.wrapContext('+sbdrt', cmd => {
    cmd.onExec(function (at) {
        return __awaiter(this, void 0, void 0, function* () {
            at.writeLineStart(`${cmd.name.toUpperCase()}:\r\n`);
            at.writeRaw(this.mtBuffer.buffer);
        });
    });
});
exports.CMD_SBDWT = cmd_1.ATCmd.wrapContext('+sbdwt', cmd => {
    cmd.onSet(/.+/, function (at, [txt]) {
        return __awaiter(this, void 0, void 0, function* () {
            if (txt.length > 120) {
                return cmd_1.ATCmd.Status.ERR;
            }
            _960x_1.Modem.updateMobileBuffer(this.moBuffer, Buffer.from(txt));
        });
    });
    cmd.onExec(function (at) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = {
                OK: '0',
                ERR_TIMEOUT: '1',
            };
            at.writeLine('READY');
            const delimiter = byte => byte === 0x0D;
            return at.readRawUntil(delimiter, 60000).then(buffer => {
                _960x_1.Modem.updateMobileBuffer(this.moBuffer, buffer.subarray(0, -1));
                at.writeLine(code.OK);
            }).catch(err => {
                at.writeLine(code.ERR_TIMEOUT);
            });
        });
    });
});
/**
 * Read mobile terminated buffer
 */
exports.CMD_SBDRB = cmd_1.ATCmd.wrapContext('+sbdrb', cmd => {
    cmd.onExec(function (at) {
        return __awaiter(this, void 0, void 0, function* () {
            let offset = 0;
            const mtBuf = this.mtBuffer;
            // LENGTH (2 bytes) + MESSAGE (LENGTH bytes) + CHECKSUM (2 bytes)
            const totalLength = 2 + mtBuf.buffer.length + 2;
            const buffer = Buffer.alloc(totalLength);
            offset = buffer.writeUint16BE(mtBuf.buffer.length, offset);
            // copy() do not returns an offset, returns the
            // number of bytes copied instead
            offset += mtBuf.buffer.copy(buffer, offset);
            offset = buffer.writeUInt16BE(mtBuf.checksum, offset);
            at.writeRaw(buffer);
        });
    });
});
exports.CMD_SBDWB = cmd_1.ATCmd.wrapContext('+sbdwb', cmd => {
    cmd.onSet(/\d+/, function (at, match) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = {
                OK: '0',
                ERR_TIMEOUT: '1',
                ERR_CHECKSUM: '2',
                ERR_LENGTH: '3', // message length is out of bounds [1, 340]
            };
            const payloadLength = parseInt(match[0]);
            if (payloadLength < 1 || payloadLength > 340) {
                at.writeLine(code.ERR_LENGTH);
            }
            else {
                at.writeLine('READY');
                return (0, _960x_1.readMB)(at, payloadLength).then(mobBuf => {
                    if ((0, _960x_1.validateMB)(mobBuf)) { // message is valid
                        _960x_1.Modem.updateMobileBuffer(this.moBuffer, mobBuf.buffer, mobBuf.checksum);
                        at.writeLine(code.OK);
                    }
                    else {
                        at.writeLine(code.ERR_CHECKSUM);
                    }
                }).catch(err => {
                    at.writeLine(code.ERR_TIMEOUT);
                });
            }
        });
    });
});
