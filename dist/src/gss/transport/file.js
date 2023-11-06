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
exports.FileTransport = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const _1 = require(".");
class FileTransport extends _1.Transport {
    constructor(options) {
        super();
        this.READ_TIMEOUT = 5000;
        this.options = options;
    }
    sendBuffer(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            // const writeStream = fs.createWriteStream( this.options.path );
            return fs_extra_1.default.writeFile(this.options.path, buffer).then(() => {
                return Buffer.from([]);
            });
        });
    }
    sendSessionMessage(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            return msg;
        });
    }
}
exports.FileTransport = FileTransport;
