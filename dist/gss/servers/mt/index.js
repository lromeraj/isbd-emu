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
exports.MTServer = void 0;
const net_1 = __importDefault(require("net"));
const colors_1 = __importDefault(require("colors"));
const events_1 = require("events");
const logger = __importStar(require("../../../logger"));
const fastq_1 = __importDefault(require("fastq"));
const decoder_1 = require("../../msg/decoder");
const encoder_1 = require("../../msg/encoder");
const log = logger.create(__filename);
class MTServer extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.handlers = {
            mtMsg: () => Promise.reject(new Error('Not implemented'))
        };
        Object.assign(this.handlers, options.handlers);
        this.mtMsgQueue = fastq_1.default.promise(this.mtMsgWorker.bind(this), 1);
        this.tcpServer = net_1.default.createServer();
        this.tcpServer.listen(options.port, () => {
            log.info(`MT server ready, port: ${colors_1.default.yellow(options.port.toString())}`);
        });
        this.tcpServer.on('connection', this.socketHandler.bind(this));
    }
    mtMsgWorker(buffers) {
        return __awaiter(this, void 0, void 0, function* () {
            const buffer = Buffer.concat(buffers);
            log.debug(`Decoding incoming MT message size=${colors_1.default.yellow(buffer.length.toString())}`);
            const mtMsg = (0, decoder_1.decodeMtMessage)(buffer);
            if (mtMsg) {
                return this.handlers.mtMsg(mtMsg);
            }
            else {
                throw new Error(`Could not decode MT message`);
            }
        });
    }
    socketHandler(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            const MAX_MSG_LEN = 1024; // maximum message length
            const SOCKET_TIMEOUT = 8000; // milliseconds
            const PROTO_HEADER_LEN = 3; // protocol header length
            let bytesRead = 0;
            let bytesToRead = MAX_MSG_LEN; // this works as a maximum limit too
            let buffersRead = [];
            let headerBuffer = null;
            socket.setTimeout(SOCKET_TIMEOUT);
            socket.on('timeout', () => {
                socket.destroy();
            });
            socket.on('data', buffer => {
                buffersRead.push(buffer);
                bytesRead += buffer.length;
                if (headerBuffer === null
                    && bytesRead >= PROTO_HEADER_LEN) {
                    headerBuffer = buffersRead.length > 1
                        ? Buffer.concat(buffersRead)
                        : buffersRead[0];
                    buffersRead = [headerBuffer];
                    const protoRev = headerBuffer.readUint8(0);
                    const msgLen = headerBuffer.readUint16BE(1);
                    if (protoRev === 0x01 && msgLen <= MAX_MSG_LEN) {
                        // PROTO HEADER LENGTH  +   MSG LEN
                        //       3 bytes            N bytes = 3 + N
                        bytesToRead = PROTO_HEADER_LEN + msgLen;
                    }
                    else {
                        socket.destroy();
                        return;
                    }
                }
                const sendConfirmation = (mtConfirm) => {
                    socket.write((0, encoder_1.encodeMtMessage)(mtConfirm), err => {
                        socket.end();
                    });
                };
                if (bytesRead === bytesToRead) {
                    this.mtMsgQueue.push(buffersRead).then(sendConfirmation)
                        .catch(err => {
                        socket.destroy();
                        log.error(`Error processing MT message => ${err.message}`);
                    });
                }
                else if (bytesRead > bytesToRead) {
                    socket.destroy();
                }
            });
        });
    }
}
exports.MTServer = MTServer;
(function (MTServer) {
    ;
})(MTServer = exports.MTServer || (exports.MTServer = {}));
