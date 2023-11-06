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
Object.defineProperty(exports, "__esModule", { value: true });
const logger = __importStar(require("../src/logger"));
const commander_1 = require("commander");
const _960x_1 = require("../src/isu/960x");
commander_1.program
    .version('0.0.5')
    .description('A simple emulator for Iridium SBD 960X transceivers')
    .option('-v, --verbose', 'Verbosity level', (_, prev) => prev + 1, 1);
commander_1.program.addOption(// TODO: rename
new commander_1.Option('-p, --path <string>', 'serial port path')
    .makeOptionMandatory());
commander_1.program.addOption(new commander_1.Option('-i, --imei <string>', 'set ISU IMEI')
    .default('527695889002193'));
commander_1.program.addOption(new commander_1.Option('--gss-host <string>', 'GSS Socket host')
    .default('localhost'));
commander_1.program.addOption(new commander_1.Option('--gss-port <string>', 'GSS Socket port')
    .default(10802).argParser(v => parseInt(v)));
commander_1.program.addOption(new commander_1.Option('--gss-uri <string>', 'GSS Socket URI')
    .conflicts(['gssPort', 'gssHost']));
const log = logger.create('main');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        commander_1.program.parse();
        const opts = commander_1.program.opts();
        logger.setLevel(opts.verbose);
        if (!/[0-9]{15}/.test(opts.imei)) {
            log.error(`Given IMEI is not valid`);
            process.exit(1);
        }
        const modem = new _960x_1.Modem({
            gss: {
                port: opts.gssPort,
                host: opts.gssHost,
            },
            dte: {
                path: opts.path,
            },
            imei: opts.imei,
        });
    });
}
main();
