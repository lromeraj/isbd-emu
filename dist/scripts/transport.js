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
const tcp_1 = require("../src/gss/transport/tcp");
const decoder_1 = require("../src/gss/msg/decoder");
const utils_1 = require("./utils");
const log = logger.create('main');
commander_1.program
    .version('0.0.2')
    .description('Iridium SBD message transporter');
commander_1.program.addArgument(new commander_1.Argument('[file]', 'SBD binary message file'));
commander_1.program.addOption(new commander_1.Option('--tcp-host <string>', 'TCP transport host')
    .default('localhost'));
commander_1.program.addOption(new commander_1.Option('--tcp-port <number>', 'TCP transport port')
    .default(10800).argParser(v => parseInt(v)));
function writeMtConfirmation(mtConfirm, buffer) {
    if (process.stdout.isTTY) {
        const outFileName = `MTC_${mtConfirm.imei}_${mtConfirm.autoid}.sbd`;
        fs_extra_1.default.writeFile(outFileName, buffer).then(() => {
            log.success(`MT confirmation message written to ${colors_1.default.green(outFileName)}`);
        }).catch(err => {
            log.error(`Could not write MT confirmation message => ${err.message}`);
        });
    }
    else {
        log.success(`MT confirmation received`);
        process.stdout.write(buffer);
    }
}
function processMtMessage(transport, mtReqBuff) {
    log.info(`Sending MT message ...`);
    return transport.sendBuffer(mtReqBuff, {
        waitResponse: true
    }).then(mtRespBuff => {
        const mtMsg = (0, decoder_1.decodeMtMessage)(mtRespBuff);
        if (mtMsg && mtMsg.confirmation) {
            writeMtConfirmation(mtMsg.confirmation, mtRespBuff);
        }
        else {
            log.error(`Could not decode MT confirmation message`);
        }
    }).catch(err => {
        log.error(`Could not send message => ${err.message}`);
    });
}
function processMoMessage(transport, reqBuff) {
    log.info(`Sending MO message ...`);
    return transport.sendBuffer(reqBuff).then(() => {
        log.success(`MO message sent`);
    }).catch(err => {
        log.error(`Could not send MO message => ${err.message}`);
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        commander_1.program.parse();
        const programArgs = commander_1.program.args;
        const opts = commander_1.program.opts();
        logger.setProgramName('transport');
        if (!process.stdout.isTTY) {
            logger.disableTTY();
        }
        let inputStream;
        const [srcFilePath] = programArgs;
        if (srcFilePath) {
            inputStream = fs_extra_1.default.createReadStream(srcFilePath);
        }
        else {
            inputStream = process.stdin;
        }
        (0, utils_1.collectInputStream)(inputStream).then(buffer => {
            const transport = new tcp_1.TCPTransport({
                host: opts.tcpHost,
                port: opts.tcpPort,
            });
            let decodedMsg = null;
            if ((decodedMsg = (0, decoder_1.decodeMtMessage)(buffer))) {
                // const mtMsg = decodedMsg as Message.MT;
                processMtMessage(transport, buffer);
            }
            else if ((decodedMsg = (0, decoder_1.decodeMoMessage)(buffer))) {
                // const moMsg = decodedMsg as Message.MO;
                processMoMessage(transport, buffer);
            }
            else {
                log.error(`Input message not recognized`);
            }
        }).catch(err => {
            log.error(`Read error => ${err.message}`);
        });
    });
}
main();
