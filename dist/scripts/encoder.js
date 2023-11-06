#!/usr/bin/node
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const colors_1 = __importDefault(require("colors"));
const logger = __importStar(require("../src/logger"));
const commander_1 = require("commander");
const msg_1 = require("../src/gss/msg");
const encoder_1 = require("../src/gss/msg/encoder");
const utils_1 = require("./utils");
const log = logger.create('main');
commander_1.program
    .version('0.0.3')
    .description('Message encoder for Iridium SBD');
commander_1.program.addArgument(new commander_1.Argument('[file]', 'JSON message file'));
function processMtMessage(mtMsg) {
    const encodedBuffer = (0, encoder_1.encodeMtMessage)(mtMsg);
    if (process.stdout.isTTY) {
        let outFileName = 'MT.sbd';
        if (mtMsg.header) {
            outFileName = `MT_${mtMsg.header.imei}_${mtMsg.header.ucmid.toString('hex').toUpperCase()}.sbd`;
        }
        else if (mtMsg.confirmation) {
            outFileName = `MTC_${mtMsg.confirmation.imei}_${mtMsg.confirmation.autoid}.sbd`;
        }
        return fs_extra_1.default.writeFile(outFileName, encodedBuffer).then(() => {
            log.success(`MT message written to ${colors_1.default.green(outFileName)}`);
        }).catch(err => {
            log.error(`Could not write MT message ${colors_1.default.red(outFileName)} => ${err.message}`);
        });
    }
    else {
        process.stdout.write(encodedBuffer);
        log.success(`MT message encoded`);
    }
}
function processMoMessage(moMsg) {
    const encodedBuffer = (0, encoder_1.encodeMoMsg)(moMsg);
    if (process.stdout.isTTY) {
        let outFileName = 'MO.sbd';
        if (moMsg.header) {
            outFileName = `MO_${moMsg.header.imei}_${moMsg.header.momsn.toString().padStart(6, '0')}.sbd`;
        }
        return fs_extra_1.default.writeFile(outFileName, encodedBuffer).then(() => {
            log.success(`MO message written to ${colors_1.default.green(outFileName)}`);
        }).catch(err => {
            log.error(`Could not write MO message ${colors_1.default.red(outFileName)} => ${err.message}`);
        });
    }
    else {
        process.stdout.write(encodedBuffer);
        log.success(`MO message encoded`);
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        commander_1.program.parse();
        logger.setProgramName('encoder');
        if (!process.stdout.isTTY) {
            logger.disableTTY();
        }
        let inputStream;
        const [srcFilePath] = commander_1.program.args;
        if (srcFilePath) {
            inputStream = fs_extra_1.default.createReadStream(srcFilePath);
        }
        else {
            inputStream = process.stdin;
        }
        (0, utils_1.collectInputStream)(inputStream).then(jsonBuffer => {
            const msgObj = msg_1.Message.fromJSON(jsonBuffer.toString());
            if (msg_1.Message.isMT(msgObj)) {
                processMtMessage(msgObj);
            }
            else if (msg_1.Message.isMO(msgObj)) {
                processMoMessage(msgObj);
            }
            else {
                log.error(`Invalid JSON, could not recognize message type`);
            }
        }).catch(err => {
            log.error(`Read error => ${err.message}`);
        });
    });
}
main();
