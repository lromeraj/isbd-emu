"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTPTransport = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const _1 = require(".");
const index_1 = require("../index");
const msg_1 = require("../msg");
class SMTPTransport extends _1.Transport {
    constructor(options) {
        super();
        this.options = options;
        this.transporter = nodemailer_1.default.createTransport({
            host: options.host,
            port: options.port,
            auth: {
                user: options.user,
                pass: options.password || '',
            }
        });
    }
    sendBuffer(buffer) {
        return Promise.resolve(Buffer.from([]));
    }
    getStatusFromMsg(msg) {
        const stsText = {
            [index_1.GSS.Session.Status.TRANSFER_OK]: 'Transfer OK',
            [index_1.GSS.Session.Status.MT_MSG_TOO_LARGE]: 'MT Message Too Large',
            [index_1.GSS.Session.Status.SBD_TIMEOUT]: 'SBD Timeout',
            [index_1.GSS.Session.Status.MO_MSG_TOO_LARGE]: 'MO Message Too Large',
            [index_1.GSS.Session.Status.INCOMPLETE_TRANSFER]: 'Incomplete Transfer',
            [index_1.GSS.Session.Status.SBD_PROTOCOL_ERROR]: 'SBD Protocol Error',
            [index_1.GSS.Session.Status.SBD_DENIAL]: 'SBD Denial',
        };
        return `${String(msg.status).padStart(2, '0')} - ${stsText[msg.status]}`;
    }
    getTextFromMsg(msg) {
        const decDeglocation = msg_1.Message.getDDLocation(msg.location);
        return `MOMSN: ${msg.momsn}\n`
            + `MTMSN: ${msg.mtmsn}\n`
            + `Time of Session (UTC): ${msg.time.utc().format('ddd MMM D HH:mm:ss YYYY')}\n`
            + `${this.getStatusFromMsg(msg)}\n`
            + `Message Size (bytes): ${msg.payload.length}\n\n`
            + `Unit Location: Lat = ${decDeglocation.latitude.toFixed(5)} Long = ${decDeglocation.longitude.toFixed(5)}\n`
            + `CEPRadius = ${msg.location.cepRadius.toFixed(0)}`;
    }
    getSubjectFromMsg(msg) {
        return `SBD Msg From Unit: ${msg.imei}`;
    }
    getFilenameFromMsg(msg) {
        return `${msg.imei}_${String(msg.momsn).padStart(6, '0')}.sbd`;
    }
    sendSessionMessage(msg) {
        const mailOpts = {
            text: this.getTextFromMsg(msg),
            to: this.options.to || this.options.user,
            subject: this.getSubjectFromMsg(msg),
        };
        if (msg.payload.length > 0) {
            mailOpts.attachments = [{
                    filename: this.getFilenameFromMsg(msg),
                    content: msg.payload
                }];
        }
        return this.transporter.sendMail(mailOpts)
            .then(() => msg);
    }
}
exports.SMTPTransport = SMTPTransport;
