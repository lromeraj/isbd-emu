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
const colors_1 = __importDefault(require("colors"));
const logger = __importStar(require("../src/logger"));
const commander_1 = require("commander");
const smtp_1 = require("../src/gss/transport/smtp");
const tcp_1 = require("../src/gss/transport/tcp");
const gss_1 = require("../src/gss");
const log = logger.create('main');
commander_1.program
    .version('0.0.2')
    .description('A simple emulator for Iridium GSS')
    .option('-v, --verbose', 'Verbosity level', (_, prev) => prev + 1, 1);
commander_1.program.addOption(new commander_1.Option('--mo-smtp-host <string>', 'MO SMTP transport host'));
commander_1.program.addOption(new commander_1.Option('--mo-smtp-port <number>', 'MO SMTP transport port')
    .default(25).argParser(v => parseInt(v)));
commander_1.program.addOption(new commander_1.Option('--mo-smtp-user <string>', 'MO SMTP transport username'));
commander_1.program.addOption(new commander_1.Option('--mo-smtp-password <string>', 'MO SMTP transport password'));
commander_1.program.addOption(new commander_1.Option('--mo-smtp-to <string>', 'MO SMTP transport destination address'));
commander_1.program.addOption(new commander_1.Option('--mo-tcp-host <string>', 'MO TCP transport host')
    .default('localhost'));
commander_1.program.addOption(new commander_1.Option('--mo-tcp-port <number>', 'MO TCP transport port')
    .default(10801).argParser(v => parseInt(v)));
commander_1.program.addOption(new commander_1.Option('--mt-server-port <number>', 'MT server port')
    .default(10800).argParser(v => parseInt(v)));
commander_1.program.addOption(new commander_1.Option('--mo-server-port <number>', 'MO server port')
    .default(10802).argParser(v => parseInt(v)));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        commander_1.program.parse();
        const opts = commander_1.program.opts();
        logger.setLevel(opts.verbose);
        const transports = [];
        let smtpTransport = undefined;
        if (opts.moSmtpUser && opts.moSmtpHost) {
            const smtpOpts = {
                host: opts.moSmtpHost,
                port: opts.moSmtpPort,
                user: opts.moSmtpUser,
                password: opts.moSmtpPassword,
                to: opts.moSmtpTo,
            };
            smtpTransport = new smtp_1.SMTPTransport(smtpOpts);
            transports.push(smtpTransport);
        }
        let tcpTransport = undefined;
        if (opts.moTcpHost && opts.moTcpPort) {
            const tcpOpts = {
                host: opts.moTcpHost,
                port: opts.moTcpPort,
            };
            tcpTransport = new tcp_1.TCPTransport(tcpOpts);
            transports.push(tcpTransport);
        }
        if (transports.length === 0) {
            log.warn(`No MO transports defined`);
        }
        else {
            if (tcpTransport) {
                log.info(`Using MO TCP transport ${colors_1.default.green(opts.moTcpHost)}:${colors_1.default.yellow(opts.moTcpPort)}`);
            }
            if (smtpTransport) {
                log.info(`Using MO SMTP transport ${colors_1.default.green(opts.moSmtpHost)}:${colors_1.default.yellow(opts.moSmtpPort)}`);
            }
        }
        const gss = new gss_1.GSS({
            transports: transports,
            mtServer: {
                port: opts.mtServerPort,
                transport: tcpTransport,
            },
            moServer: {
                port: opts.moServerPort
            },
        });
        // console.log( fs.readFileSync( path.join( __dirname, '../../ascii/gss.txt' ), 'ascii' ) )
    });
}
main();
