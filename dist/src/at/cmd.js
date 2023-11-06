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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATCmd = void 0;
const logger = __importStar(require("../logger"));
const log = logger.create('at-cmd');
class ATCmd {
    constructor(name, context) {
        this.cmdHandlers = {};
        this.name = name;
        this.context = context;
        this.regExp = new RegExp(`^(at${this.name.replace(/[/$&*+#]/g, '\\$&')})(\\=\\?|\\=|\\?)?(.*)\r$`, 'i');
    }
    /**
     * Fully qualified name
     */
    get fqn() {
        return 'AT' + this.name.toUpperCase();
    }
    testHandler(handler, at, strParam) {
        if (handler) {
            if (!handler.regexp && strParam === '') {
                return handler.callback.apply(this.context, [at, []]);
            }
            else if (handler.regexp) {
                const paramMatch = strParam.match(handler.regexp);
                return paramMatch
                    ? handler.callback.apply(this.context, [at, paramMatch])
                    : undefined;
            }
        }
        return undefined;
    }
    test(at, cmdStr) {
        const match = cmdStr.match(this.regExp);
        if (match) {
            const [_cmd, _name, type, strParam] = match;
            if (type === '?') {
                return this.testHandler(this.cmdHandlers.onRead, at, strParam);
            }
            else if (type === '=?') {
                return this.testHandler(this.cmdHandlers.onTest, at, strParam);
            }
            else if (type === '=') {
                return this.testHandler(this.cmdHandlers.onSet, at, strParam);
            }
            else if (type === undefined) {
                return this.testHandler(this.cmdHandlers.onExec, at, strParam);
            }
        }
        return undefined;
    }
    onExec(regExpOrCallback, callback) {
        if (regExpOrCallback instanceof RegExp
            && typeof callback === 'function') {
            this.cmdHandlers.onExec = {
                callback,
                regexp: regExpOrCallback,
            };
        }
        else if (typeof regExpOrCallback === 'function') {
            this.cmdHandlers.onExec = {
                regexp: undefined,
                callback: regExpOrCallback,
            };
        }
        return this;
    }
    onRead(callback) {
        this.cmdHandlers.onRead = { callback };
        return this;
    }
    onSet(regexp, callback) {
        this.cmdHandlers.onSet = { regexp, callback };
        return this;
    }
    onTest(callback) {
        this.cmdHandlers.onTest = { callback };
        return this;
    }
    static wrapContext(name, callback) {
        return (ctx) => {
            const cmd = new ATCmd(name, ctx);
            callback(cmd);
            return cmd;
        };
    }
}
exports.ATCmd = ATCmd;
(function (ATCmd) {
    let Status;
    (function (Status) {
        Status[Status["OK"] = 0] = "OK";
        Status[Status["ERR"] = 1] = "ERR";
    })(Status = ATCmd.Status || (ATCmd.Status = {}));
    ;
})(ATCmd = exports.ATCmd || (exports.ATCmd = {}));
