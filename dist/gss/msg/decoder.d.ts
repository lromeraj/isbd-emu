/// <reference types="node" />
import { Message } from "./index";
export declare function decodeMsgHeader(msg: Message, buf: Buffer): number;
/**
 * Decodes Iridium SBD MO Message
 *
 * @param buf Message data buffer
 *
 * @returns Decoded mobile originated message,
 * in case of failure `null` is returned
 */
export declare function decodeMoMessage(buf: Buffer): Message.MO | null;
export declare function decodeMtMessage(buf: Buffer): Message.MT | null;
