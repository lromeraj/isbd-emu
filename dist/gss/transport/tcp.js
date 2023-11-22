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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TCPTransport = void 0;
const net_1 = __importDefault(require("net"));
const _1 = require(".");
const encoder_1 = require("../msg/encoder");
class TCPTransport extends _1.Transport {
    constructor(options) {
        super();
        this.SOCKET_TIMEOUT = 5000;
        this.options = options;
    }
    sendBuffer(buffer, _opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const opts = {
                waitResponse: (_opts === null || _opts === void 0 ? void 0 : _opts.waitResponse) || false
            };
            return new Promise((resolve, reject) => {
                const respChunks = [];
                const client = new net_1.default.Socket().connect({
                    host: this.options.host,
                    port: this.options.port,
                }, () => {
                    client.write(buffer, err => {
                        if (err) {
                            rejectSending(err);
                        }
                        else {
                            if (!opts.waitResponse) {
                                resolveSending(Buffer.alloc(0));
                            }
                        }
                    });
                });
                const rejectSending = (err) => {
                    client.destroy();
                    reject(err);
                };
                const resolveSending = (response) => {
                    client.end(() => {
                        resolve(response);
                    });
                };
                client.setTimeout(this.SOCKET_TIMEOUT);
                client.on('data', data => {
                    respChunks.push(data);
                });
                client.on('close', () => {
                    resolveSending(Buffer.concat(respChunks));
                });
                client.on('timeout', () => {
                    rejectSending(new Error('Socket timeout'));
                });
                client.on('error', rejectSending);
            });
        });
    }
    // TODO: split this function
    sendMessage(msg, encoder, _opts) {
        return this.sendBuffer(encoder(msg), _opts);
    }
    sendSessionMessage(sessionMsg) {
        return this.sendMessage(sessionMsg, this.encodeSessionMessage.bind(this)).then(() => sessionMsg);
    }
    encodeSessionMessage(msg) {
        const moMsg = {
            header: {
                cdr: 0,
                // TODO: this field should be included in the SessionMessage type
                momsn: msg.momsn,
                mtmsn: msg.mtmsn,
                imei: msg.imei,
                status: msg.status,
                time: msg.time,
            },
            location: msg.location,
        };
        if (msg.payload.length > 0) {
            moMsg.payload = {
                payload: msg.payload,
                length: msg.payload.length,
            };
        }
        return (0, encoder_1.encodeMoMsg)(moMsg);
    }
}
exports.TCPTransport = TCPTransport;
