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
exports.ISUServer = void 0;
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const colors_1 = __importDefault(require("colors"));
const events_1 = __importDefault(require("events"));
const logger = __importStar(require("../../../logger"));
const log = logger.create('isu-server');
// https://stackoverflow.com/a/39145058
// export declare interface SUServer {
//   on(
//     event: 'initSession', 
//     listener: (
//       req: GSS.SessionRequest, 
//       callback: ( res: GSS.SessionResponse ) => void 
//     ) => void 
//   ): this;
// }
class ISUServer extends events_1.default {
    constructor(options) {
        super();
        this.sockets = {};
        this.handlers = {
            initSession: () => Promise.reject(new Error('Not implemented'))
        };
        Object.assign(this.handlers, options.handlers);
        this.httpServer = http_1.default.createServer();
        this.socketServer = new socket_io_1.default.Server(this.httpServer);
        this.httpServer.listen(options.port, () => {
            log.success(`ISU server ready, port: ${colors_1.default.yellow(options.port.toString())}`);
        });
        this.socketServer.on('connect', socket => {
            const imei = socket.handshake.query.imei;
            if (typeof imei === 'string') {
                this.sockets[imei] = socket;
                socket.on('initSession', (sessionReq, callback) => {
                    this.handlers.initSession(sessionReq).then(callback)
                        .catch(err => {
                        log.error(`Init session failed => ${err.stack}`);
                    });
                });
                socket.on('disconnect', () => {
                    delete this.sockets[imei];
                    log.debug(`ISU ${colors_1.default.bold(imei)} disconnected`);
                });
                log.debug(`ISU ${colors_1.default.bold(imei)} connected`);
            }
            else {
                socket.disconnect();
            }
        });
    }
    sendRingAlert(imei) {
        const socket = this.sockets[imei];
        log.debug(`Sending ring alert to ${imei}`);
        if (socket) {
            socket.emit('ring');
        }
    }
}
exports.ISUServer = ISUServer;
