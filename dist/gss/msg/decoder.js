"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeMtMessage = exports.decodeMoMessage = exports.decodeMsgHeader = void 0;
const moment_1 = __importDefault(require("moment"));
const index_1 = require("./index");
function decodeMsgHeader(msg, buf) {
    const msgRev = buf.readUint8(0);
    const msgLength = buf.readUint16BE(1);
    const length = buf.length - index_1.MSG_H_LEN;
    if (msgRev === index_1.MSG_REV && msgLength === length) {
        msg.length = msgLength;
        msg.rev = msgRev;
    }
    else {
        throw new Error('Invalid message header');
    }
    return index_1.MSG_H_LEN;
}
exports.decodeMsgHeader = decodeMsgHeader;
/**
 *
 * @param msg
 * @param data
 * @param offset
 * @returns The number of bytes read
 */
function decodeMoHeader(msg, data, offset) {
    const header = {
        id: data.readUint8(offset),
        length: data.readUint16BE(offset + 1),
        cdr: data.readUint32BE(offset + 3),
        imei: data.subarray(offset + 7, offset + 22).toString('ascii'),
        status: data.readUint8(offset + 22),
        momsn: data.readUInt16BE(offset + 23),
        mtmsn: data.readUint16BE(offset + 25),
        time: moment_1.default.unix(data.readUint32BE(offset + 27)),
    };
    msg.header = header;
    // IE header length + IE length
    return index_1.IE_H_LEN + header.length;
}
function decodeMoLocation(msg, data, offset) {
    const location = {
        id: data.readUint8(offset),
        length: data.readUInt16BE(offset + 1),
        lat: {
            deg: 0,
            min: 0,
        },
        lon: {
            deg: 0,
            min: 0,
        },
        latitude: 0,
        longitude: 0,
        cepRadius: data.readUint32BE(offset + 10),
    };
    const header = data.readUint8(offset + 3);
    const latDeg = data.readUint8(offset + 4);
    const latThoMin = data.readUint16BE(offset + 5);
    const lonDeg = data.readUint8(offset + 7);
    const lonThoMin = data.readUint16BE(offset + 8);
    // north/south indicator
    const ewi = (header & 0x01) ? -1 : 1;
    // east/west indicator
    const nsi = ((header >> 1) & 0x01) ? -1 : 1;
    // this will be removed in a near future
    location.latitude = nsi * (latDeg + (latThoMin / 60000));
    location.longitude = ewi * (lonDeg + (lonThoMin / 60000));
    location.lat = {
        deg: nsi * latDeg,
        min: latThoMin,
    };
    location.lon = {
        deg: ewi * lonDeg,
        min: lonThoMin,
    };
    msg.location = location;
    return index_1.IE_H_LEN + location.length;
}
function decodeMoPayload(msg, data, offset) {
    const id = data.readUint8(offset);
    const length = data.readUInt16BE(offset + 1);
    const payload = {
        id,
        length,
        payload: data.subarray(offset + 3, offset + 3 + length),
    };
    msg.payload = payload;
    return index_1.IE_H_LEN + length;
}
/**
 * Decodes Iridium SBD MO Message
 *
 * @param buf Message data buffer
 *
 * @returns Decoded mobile originated message,
 * in case of failure `null` is returned
 */
function decodeMoMessage(buf) {
    const msg = {};
    try {
        let offset = decodeMsgHeader(msg, buf);
        for (; offset < buf.length;) {
            if (buf[offset] === index_1.IE_MO_HEADER_ID) {
                offset += decodeMoHeader(msg, buf, offset);
            }
            else if (buf[offset] === index_1.IE_MO_PAYLOAD_ID) {
                offset += decodeMoPayload(msg, buf, offset);
            }
            else if (buf[offset] === index_1.IE_MO_LOCATION_ID) {
                offset += decodeMoLocation(msg, buf, offset);
            }
            else if (buf[offset] === index_1.IE_MO_CONFIRMATION_ID) {
                // TODO: ... 
            }
            else {
                return null;
            }
        }
    }
    catch (e) {
        return null;
    }
    return msg;
}
exports.decodeMoMessage = decodeMoMessage;
function decodeMtPayload(msg, buffer, offset) {
    const id = buffer.readUint8(offset);
    const length = buffer.readUint16BE(offset + 1);
    msg.payload = {
        id,
        length,
        payload: buffer.subarray(offset + 3, offset + 3 + length)
    };
    // InformationElement  +  MT Payload
    //     3 (bytes)       +  N (bytes) = 3 + N bytes
    return index_1.IE_H_LEN + length;
}
function decodeMtHeader(msg, buffer, offset) {
    const header = {
        id: buffer.readUint8(offset),
        length: buffer.readUint16BE(offset + 1),
        ucmid: buffer.subarray(offset + 3, offset + 7),
        imei: buffer.subarray(offset + 7, offset + 22).toString('ascii'),
        flags: buffer.readUint16BE(offset + 22),
    };
    msg.header = header;
    // InformationElement  +  MT Header
    //     3 (bytes)       +  21 (bytes) = 24 bytes
    return index_1.IE_H_LEN + header.length;
}
function decodeMtConfirmation(msg, buffer, offset) {
    const confirmation = {
        id: buffer.readUint8(offset),
        length: buffer.readUint16BE(offset + 1),
        ucmid: buffer.subarray(offset + 3, offset + 7),
        imei: buffer.subarray(offset + 7, offset + 22).toString('ascii'),
        autoid: buffer.readUint32BE(offset + 22),
        status: buffer.readInt16BE(offset + 26),
    };
    msg.confirmation = confirmation;
    // InformationElement  +  MT Header
    //     3 (bytes)       +  21 (bytes) = 24 bytes
    return index_1.IE_H_LEN + confirmation.length;
}
function decodeMtMessage(buf) {
    const msg = {};
    try {
        let offset = decodeMsgHeader(msg, buf);
        for (; offset < buf.length;) {
            if (buf[offset] === index_1.IE_MT_HEADER_ID) {
                offset += decodeMtHeader(msg, buf, offset);
            }
            else if (buf[offset] === index_1.IE_MT_PAYLOAD_ID) {
                offset += decodeMtPayload(msg, buf, offset);
            }
            else if (buf[offset] === index_1.IE_MT_CONFIRMATION_ID) {
                offset += decodeMtConfirmation(msg, buf, offset);
            }
            else {
                return null;
            }
        }
    }
    catch (e) {
        return null;
    }
    return msg;
}
exports.decodeMtMessage = decodeMtMessage;
