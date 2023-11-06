"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeMtMessage = exports.encodeMoMsg = void 0;
const _1 = require(".");
function encodeMsg(payload) {
    let offset = 0;
    const msgHeaderBuf = Buffer.alloc(_1.MSG_H_LEN);
    const msgPayloadLength = payload.reduce((prev, cur) => prev + cur.length, 0);
    offset = msgHeaderBuf.writeUint8(_1.MSG_REV, offset);
    offset = msgHeaderBuf.writeUint16BE(msgPayloadLength, offset);
    return Buffer.concat([msgHeaderBuf, ...payload]);
}
function encodeMoHeader(msg) {
    const buffer = Buffer.alloc(_1.IE_H_LEN + _1.IE_MO_HEADER_LEN);
    let offset = 0;
    offset = buffer.writeUint8(_1.IE_MO_HEADER_ID, offset);
    offset = buffer.writeUint16BE(_1.IE_MO_HEADER_LEN, offset);
    offset = buffer.writeUint32BE(msg.cdr, offset);
    offset += buffer.write(msg.imei, offset, 15, 'ascii');
    offset = buffer.writeUint8(msg.status, offset);
    offset = buffer.writeUint16BE(msg.momsn, offset);
    offset = buffer.writeUint16BE(msg.mtmsn, offset);
    offset = buffer.writeUint32BE(msg.time.unix(), offset);
    return buffer;
}
function encodeMoPayload(msg) {
    const buffer = Buffer.alloc(_1.IE_H_LEN + msg.payload.length);
    let offset = 0;
    offset = buffer.writeUInt8(_1.IE_MO_PAYLOAD_ID, offset);
    offset = buffer.writeUint16BE(msg.payload.length, offset);
    offset += msg.payload.copy(buffer, offset);
    return buffer;
}
function encodeMoLocation(msg) {
    const buffer = Buffer.alloc(_1.IE_H_LEN + _1.IE_MO_LOCATION_LEN);
    let nsi, // north south indicator 
    ewi; // east west indicator
    let latDeg, // latitude degrees
    lonDeg; // longitue degrees
    let latThoMin, // latitude thousand minutes
    lonThoMin; // longitude thousand minutes
    if (msg.latitude && msg.longitude) {
        nsi = Number(msg.latitude < 0) << 1;
        ewi = Number(msg.longitude < 0);
        latDeg = Math.abs(Math.trunc(msg.latitude));
        lonDeg = Math.abs(Math.trunc(msg.longitude));
        latThoMin = Math.abs(msg.latitude) % 1;
        lonThoMin = Math.abs(msg.longitude) % 1;
        latThoMin = Math.round(latThoMin * 60000);
        lonThoMin = Math.round(lonThoMin * 60000);
    }
    else {
        nsi = Number(msg.lat.deg < 0) << 1;
        ewi = Number(msg.lon.deg < 0);
        latDeg = Math.abs(msg.lat.deg);
        lonDeg = Math.abs(msg.lon.deg);
        latThoMin = msg.lat.min;
        lonThoMin = msg.lon.min;
    }
    let offset = 0;
    offset = buffer.writeUint8(_1.IE_MO_LOCATION_ID, offset);
    offset = buffer.writeUint16BE(_1.IE_MO_LOCATION_LEN, offset);
    offset = buffer.writeUint8(nsi | ewi, offset);
    offset = buffer.writeUint8(latDeg, offset);
    offset = buffer.writeUint16BE(latThoMin, offset);
    offset = buffer.writeUint8(lonDeg, offset);
    offset = buffer.writeUint16BE(lonThoMin, offset);
    offset = buffer.writeUint32BE(msg.cepRadius, offset);
    return buffer;
}
function encodeMoMsg(msg) {
    let payload = [];
    if (msg.header) {
        payload.push(encodeMoHeader(msg.header));
    }
    if (msg.location) {
        payload.push(encodeMoLocation(msg.location));
    }
    if (msg.payload) {
        payload.push(encodeMoPayload(msg.payload));
    }
    if (msg.confirmation) {
        // TODO: ...
    }
    return encodeMsg(payload);
}
exports.encodeMoMsg = encodeMoMsg;
function encodeMtPayload(msg) {
    let offset = 0;
    const buffer = Buffer.alloc(_1.IE_H_LEN + msg.payload.length);
    offset = buffer.writeUint8(_1.IE_MT_PAYLOAD_ID, offset);
    offset = buffer.writeUint16BE(msg.payload.length, offset);
    offset += msg.payload.copy(buffer, offset);
    return buffer;
}
function encodeMtHeader(msg) {
    let offset = 0;
    const buffer = Buffer.alloc(_1.IE_H_LEN + _1.IE_MT_HEADER_LEN);
    if (msg.flags === undefined) {
        msg.flags = _1.Message.MT.Header.Flag.NONE;
    }
    offset = buffer.writeUint8(_1.IE_MT_HEADER_ID, offset);
    offset = buffer.writeUint16BE(_1.IE_MT_HEADER_LEN, offset);
    offset += msg.ucmid.copy(buffer, offset);
    offset += buffer.write(msg.imei, offset, 15, 'ascii');
    offset = buffer.writeUint16BE(msg.flags, offset);
    return buffer;
}
function encodeMtConfirmation(msg) {
    let offset = 0;
    const buffer = Buffer.alloc(_1.IE_H_LEN + _1.IE_MT_CONFIRMATION_LEN);
    offset = buffer.writeUint8(_1.IE_MT_CONFIRMATION_ID, offset);
    offset = buffer.writeUint16BE(_1.IE_MT_CONFIRMATION_LEN, offset);
    offset += msg.ucmid.copy(buffer, offset);
    offset += buffer.write(msg.imei, offset, 15, 'ascii');
    offset = buffer.writeUint32BE(msg.autoid, offset);
    offset = buffer.writeInt16BE(msg.status, offset);
    return buffer;
}
function encodeMtMessage(msg) {
    const msgChunks = [];
    if (msg.header) {
        msgChunks.push(encodeMtHeader(msg.header));
    }
    if (msg.payload) {
        msgChunks.push(encodeMtPayload(msg.payload));
    }
    if (msg.confirmation) {
        msgChunks.push(encodeMtConfirmation(msg.confirmation));
    }
    return encodeMsg(msgChunks);
}
exports.encodeMtMessage = encodeMtMessage;
