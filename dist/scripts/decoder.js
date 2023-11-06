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
const logger = __importStar(require("../src/logger"));
const commander_1 = require("commander");
const decoder_1 = require("../src/gss/msg/decoder");
const msg_1 = require("../src/gss/msg");
const utils_1 = require("./utils");
const log = logger.create('main');
commander_1.program
    .version('0.0.3')
    .description('Message decoder for Iridium SBD');
commander_1.program.addArgument(new commander_1.Argument('[file]', 'SBD message file path'));
commander_1.program.addOption(new commander_1.Option('--pretty', 'Output will be more human readable'));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        commander_1.program.parse();
        const opts = commander_1.program.opts();
        logger.setProgramName('decoder');
        const [srcFilePath] = commander_1.program.args;
        if (!process.stdout.isTTY) {
            logger.disableTTY();
        }
        let inputStream;
        if (srcFilePath) {
            inputStream = fs_extra_1.default.createReadStream(srcFilePath);
        }
        else {
            inputStream = process.stdin;
        }
        (0, utils_1.collectInputStream)(inputStream).then(buffer => {
            const decoders = [
                decoder_1.decodeMoMessage,
                decoder_1.decodeMtMessage
            ];
            let message = null;
            for (let decoder of decoders) {
                message = decoder(buffer);
                if (message) {
                    process.stdout.write(msg_1.Message.toJSON(message, opts.pretty) + '\n');
                    break;
                }
            }
            if (message) {
                log.success('Message successfully decoded');
            }
            else {
                log.error('Decode failed, invalid binary format');
            }
        }).catch(err => {
            log.error(`Read error => ${err.message}`);
        });
    });
}
main();
