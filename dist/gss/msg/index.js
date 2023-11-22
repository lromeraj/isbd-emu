"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = exports.IE_MT_PRIORITY_ID = exports.IE_MT_PAYLOAD_ID = exports.IE_MT_CONFIRMATION_LEN = exports.IE_MT_CONFIRMATION_ID = exports.IE_MT_HEADER_LEN = exports.IE_MT_HEADER_ID = exports.IE_MO_PAYLOAD_ID = exports.IE_MO_CONFIRMATION_LEN = exports.IE_MO_CONFIRMATION_ID = exports.IE_MO_LOCATION_LEN = exports.IE_MO_LOCATION_ID = exports.IE_MO_HEADER_LEN = exports.IE_MO_HEADER_ID = exports.IE_H_LEN = exports.MSG_H_LEN = exports.MSG_REV = void 0;
const moment_1 = __importDefault(require("moment"));
exports.MSG_REV = 0x01;
exports.MSG_H_LEN = 3;
exports.IE_H_LEN = 3;
exports.IE_MO_HEADER_ID = 0x01;
exports.IE_MO_HEADER_LEN = 28;
exports.IE_MO_LOCATION_ID = 0x03;
exports.IE_MO_LOCATION_LEN = 11;
exports.IE_MO_CONFIRMATION_ID = 0x05;
exports.IE_MO_CONFIRMATION_LEN = 1;
exports.IE_MO_PAYLOAD_ID = 0x02;
exports.IE_MT_HEADER_ID = 0x41;
exports.IE_MT_HEADER_LEN = 21;
exports.IE_MT_CONFIRMATION_ID = 0x44;
exports.IE_MT_CONFIRMATION_LEN = 25;
exports.IE_MT_PAYLOAD_ID = 0x42;
exports.IE_MT_PRIORITY_ID = 0x46;
var Message;
(function (Message) {
    let MT;
    (function (MT) {
        let Header;
        (function (Header) {
            let Flag;
            (function (Flag) {
                Flag[Flag["NONE"] = 0] = "NONE";
                Flag[Flag["FLUSH_MT_QUEUE"] = 1] = "FLUSH_MT_QUEUE";
                Flag[Flag["SEND_RING_ALERT"] = 2] = "SEND_RING_ALERT";
            })(Flag = Header.Flag || (Header.Flag = {}));
        })(Header = MT.Header || (MT.Header = {}));
    })(MT = Message.MT || (Message.MT = {}));
    /**
     * Converts the given mobile orginated message location
     * into a decimal degreee coordinate representation
     *
     * @param location
     * @returns Decimal degree coordiante representation
     */
    function getDDLocation(location) {
        const latitude = location.lat.deg
            + Math.sign(location.lat.deg) * (location.lat.min / 60000);
        const longitude = location.lon.deg
            + Math.sign(location.lon.deg) * (location.lon.min / 60000);
        return {
            latitude,
            longitude,
        };
    }
    Message.getDDLocation = getDDLocation;
    function isMO(object) {
        if (object.header) {
            if (object.header.cdr !== undefined) {
                return true;
            }
        }
        return false;
    }
    Message.isMO = isMO;
    function isMT(object) {
        if (object.header) {
            if (object.header.ucmid !== undefined) {
                return true;
            }
        }
        else if (object.confirmation) {
            if (object.confirmation.ucmid !== undefined
                && object.confirmation.autoid !== undefined) {
                return true;
            }
        }
        return false;
    }
    Message.isMT = isMT;
    function toJSONObject(object) {
        for (let key in object) {
            const val = object[key];
            if (val instanceof Buffer) {
                object[key] = [...val];
            }
            else if (typeof val === 'string' && key === 'payload') {
                object[key] = [...Buffer.from(val)];
            }
            else if (moment_1.default.isMoment(val)) {
                object[key] = val.unix();
            }
            else if (typeof val === 'object') {
                toJSONObject(val);
            }
        }
    }
    function toJSON(object, pretty = false) {
        const objCopy = Object.assign({}, object);
        toJSONObject(objCopy);
        if (pretty) {
            return JSON.stringify(objCopy, null, '\t');
        }
        else {
            return JSON.stringify(objCopy);
        }
    }
    Message.toJSON = toJSON;
    function fromJSONObject(object) {
        for (let key in object) {
            const val = object[key];
            if (val instanceof Array
                || (typeof val === 'string' && key === 'payload')) {
                object[key] = Buffer.from(val);
            }
            else if (typeof val === 'number' && key === 'time') {
                object[key] = moment_1.default.unix(val);
            }
            else if (typeof val === 'object') {
                fromJSONObject(val);
            }
        }
    }
    function fromJSON(jsonStr) {
        const obj = JSON.parse(jsonStr);
        fromJSONObject(obj);
        return obj;
    }
    Message.fromJSON = fromJSON;
})(Message = exports.Message || (exports.Message = {}));
