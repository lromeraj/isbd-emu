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
exports.GSS = void 0;
const fastq = __importStar(require("fastq"));
const moment_1 = __importDefault(require("moment"));
const logger = __importStar(require("../logger"));
const colors_1 = __importDefault(require("colors"));
const isu_1 = require("./servers/isu");
const mt_1 = require("./servers/mt");
const msg_1 = require("./msg");
const log = logger.create(__filename);
class GSS {
    constructor(options) {
        this.autoId = 0;
        this.subscriberUnits = {};
        this.transports = options.transports;
        this.isuServer = new isu_1.ISUServer({
            port: options.moServer.port,
            handlers: {
                initSession: this.initSession.bind(this)
            }
        });
        this.mtServer = new mt_1.MTServer({
            port: options.mtServer.port,
            handlers: {
                mtMsg: this.mtMsgHandler.bind(this),
            }
        });
    }
    getAutoId() {
        return this.autoId++;
    }
    mtMsgHandler(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            const flag = msg_1.Message.MT.Header.Flag;
            if (msg.header) {
                const isu = this.getISU(msg.header.imei);
                const confirmation = {
                    autoid: this.getAutoId(),
                    imei: msg.header.imei,
                    ucmid: msg.header.ucmid,
                    status: 0
                };
                msg.header.flags = msg.header.flags === undefined
                    ? flag.NONE
                    : msg.header.flags;
                const ringFlag = msg.header.flags & flag.SEND_RING_ALERT;
                const flushFlag = msg.header.flags & flag.FLUSH_MT_QUEUE;
                if (flushFlag) {
                    isu.mtMessages = [];
                }
                if (msg.payload) {
                    if (isu.mtMessages.length >= 50) {
                        confirmation.status = -5;
                    }
                    else {
                        isu.mtMessages.push(msg);
                        confirmation.status = isu.mtMessages.length;
                        // TODO: send a second ring alert
                        this.isuServer.sendRingAlert(msg.header.imei);
                    }
                }
                else {
                    if (ringFlag) {
                        this.isuServer.sendRingAlert(msg.header.imei);
                    }
                    else if (!flushFlag) {
                        confirmation.status = -4;
                    }
                }
                const confirmMsg = {
                    confirmation,
                };
                return confirmMsg;
            }
            else {
                const confirmMsg = {
                    confirmation: {
                        autoid: 0,
                        imei: '000000000000000',
                        ucmid: Buffer.from([
                            0x00, 0x00, 0x00, 0x00
                        ]),
                        status: -4
                    }
                };
                return confirmMsg;
            }
        });
    }
    // private increaseMTMSN( isu: SubscriberUnit  ) {
    //   isu.mtmsn = ( isu.mtmsn + 1 ) & 0xFFFF;
    // }
    sessionMsgWorker(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = this.transports.map(transport => transport.sendSessionMessage(msg));
            return Promise.allSettled(promises).then(results => {
                // If there is at least one transport that was able to transmit
                // the session message, there is no need to retry for every available
                // transports, this is the expected Iridium behavior
                const msgSent = results.some(res => res.status === 'fulfilled');
                if (msgSent) {
                    log.debug(`MO #${colors_1.default.green(msg.momsn.toString())} sent from ISU ${colors_1.default.bold(msg.imei)}`);
                    return msg;
                }
                else {
                    setTimeout(() => {
                        this.subscriberUnits[msg.imei].sessionsQueue.push(msg);
                    }, 30000); // TODO: this should be incremental
                    log.error(`MO #${colors_1.default.red(msg.momsn.toString())} failed from ISU ${colors_1.default.bold(msg.imei)}`);
                    return Promise.reject();
                }
            });
        });
    }
    getISU(imei) {
        let isu = this.subscriberUnits[imei];
        if (isu === undefined) {
            isu = this.subscriberUnits[imei] = {
                momsn: 0,
                mtmsn: 0,
                location: GSS.generateUnitLocation(),
                sessionsQueue: fastq.promise(this.sessionMsgWorker.bind(this), 1),
                mtMessages: [],
            };
        }
        return isu;
    }
    initSession(sessionReq) {
        return __awaiter(this, void 0, void 0, function* () {
            const isu = this.getISU(sessionReq.imei);
            isu.momsn = sessionReq.momsn; // update isu momsn
            const sessionResp = {
                mosts: 0,
                momsn: isu.momsn,
                mtsts: 0,
                mtmsn: 0,
                mt: Buffer.from([]),
                mtq: 0,
            };
            const mtMsg = isu.mtMessages.shift();
            if (mtMsg === null || mtMsg === void 0 ? void 0 : mtMsg.payload) {
                sessionResp.mtsts = 1;
                sessionResp.mtmsn = isu.mtmsn;
                sessionResp.mt = mtMsg.payload.payload;
                sessionResp.mtq = isu.mtMessages.length;
                isu.mtmsn++;
            }
            const transportMsg = {
                time: (0, moment_1.default)(),
                imei: sessionReq.imei,
                momsn: sessionReq.momsn,
                mtmsn: isu.mtmsn,
                payload: sessionReq.mo,
                location: isu.location,
                status: GSS.Session.Status.TRANSFER_OK,
            };
            isu.sessionsQueue.push(transportMsg);
            // TODO: handle more error codes
            sessionResp.mosts = 0;
            return sessionResp;
        });
    }
    static generateUnitLocation() {
        return {
            lat: {
                deg: Math.floor(-90 + Math.random() * 180),
                min: Math.floor(Math.random() * 60000),
            },
            lon: {
                deg: Math.floor(-90 + Math.random() * 180),
                min: Math.floor(Math.random() * 60000),
            },
            cepRadius: 1 + Math.floor(Math.random() * 2000),
        };
    }
}
exports.GSS = GSS;
(function (GSS) {
    let Session;
    (function (Session) {
        let Status;
        (function (Status) {
            /**
             * The SBD session between the ISU and the Iridium Gateway
             * completed successfully.
             */
            Status[Status["TRANSFER_OK"] = 0] = "TRANSFER_OK";
            /**
             * The MT message queued at the Iridium Gateway is too large to be
             * transferred within a single SBD session
             */
            Status[Status["MT_MSG_TOO_LARGE"] = 1] = "MT_MSG_TOO_LARGE";
            /**
             * The SBD Session timed out before session completion
             */
            Status[Status["SBD_TIMEOUT"] = 10] = "SBD_TIMEOUT";
            /**
             * The MO message being transferred by the ISU is too large to be
             * transferred within a single SBD session
             */
            Status[Status["MO_MSG_TOO_LARGE"] = 12] = "MO_MSG_TOO_LARGE";
            /**
             * A RF link loss occurred during the SBD session
             */
            Status[Status["INCOMPLETE_TRANSFER"] = 13] = "INCOMPLETE_TRANSFER";
            /**
             * An ISU protocol anomaly occurred during the SBD session
             */
            Status[Status["SBD_PROTOCOL_ERROR"] = 14] = "SBD_PROTOCOL_ERROR";
            /**
             * The ISU is not allowed to access the system
             */
            Status[Status["SBD_DENIAL"] = 15] = "SBD_DENIAL";
        })(Status = Session.Status || (Session.Status = {}));
    })(Session = GSS.Session || (GSS.Session = {}));
})(GSS = exports.GSS || (exports.GSS = {}));
