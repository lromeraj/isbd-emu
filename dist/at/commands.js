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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMD_FLOW_CONTROL = exports.CMD_DTR = exports.CMD_VERBOSE = exports.CMD_ECHO = exports.CMD_QUIET = exports.CMD_AT = void 0;
const cmd_1 = require("./cmd");
exports.CMD_AT = new cmd_1.ATCmd('', undefined)
    .onExec((at) => __awaiter(void 0, void 0, void 0, function* () { }));
exports.CMD_QUIET = new cmd_1.ATCmd('q', undefined)
    .onExec(/^[01]?$/, (at, match) => __awaiter(void 0, void 0, void 0, function* () {
    at.setQuiet(Boolean(parseInt(match[0] || '0')));
}));
exports.CMD_ECHO = new cmd_1.ATCmd('e', undefined)
    .onExec(/^[01]?$/, (at, match) => __awaiter(void 0, void 0, void 0, function* () {
    at.setEcho(Boolean(parseInt(match[0] || '0')));
}));
exports.CMD_VERBOSE = new cmd_1.ATCmd('v', undefined)
    .onExec(/^[01]?$/i, (at, match) => __awaiter(void 0, void 0, void 0, function* () {
    at.setVerbose(Boolean(parseInt(match[0] || '0')));
}));
exports.CMD_DTR = new cmd_1.ATCmd('&d', undefined)
    .onExec(/^[0-3]?$/, (at, match) => __awaiter(void 0, void 0, void 0, function* () {
    const opt = parseInt(match[0] || '0');
    // TODO: ....
}));
exports.CMD_FLOW_CONTROL = new cmd_1.ATCmd('&k', undefined)
    .onExec(/^[03]?$/, (at, match) => __awaiter(void 0, void 0, void 0, function* () {
    const opt = parseInt(match[0] || '0');
    at.setFlowControl(opt === 3);
}));
