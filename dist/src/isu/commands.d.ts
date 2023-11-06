import { ATCmd } from "../at/cmd";
import { Modem } from "./960x";
/**
 * 5.21 +CGSN – Serial Number
 */
export declare const CMD_CGSN: ATCmd.ContextWrapper<Modem>;
/**
 * 5.21 +CGSN – Serial Number
 */
export declare const CMD_CIER: ATCmd.ContextWrapper<Modem>;
export declare const CMD_SBDMTA: ATCmd.ContextWrapper<Modem>;
/**
 * Transfer mobile terminated originated buffer
 * to mobile terminated buffer
 */
export declare const CMD_SBDTC: ATCmd.ContextWrapper<Modem>;
/**
 * 5.38 +SBDIX – Short Burst Data: Initiate an SBD Session Extended
 */
export declare const CMD_SBDIX: ATCmd.ContextWrapper<Modem>;
export declare const CMD_SBDIXA: ATCmd.ContextWrapper<Modem>;
/**
 * 5.42 +SBDD – Short Burst Data: Clear SBD Message Buffer(s)
 */
export declare const CMD_SBDD: ATCmd.ContextWrapper<Modem>;
export declare const CMD_SBDRT: ATCmd.ContextWrapper<Modem>;
export declare const CMD_SBDWT: ATCmd.ContextWrapper<Modem>;
/**
 * Read mobile terminated buffer
 */
export declare const CMD_SBDRB: ATCmd.ContextWrapper<Modem>;
export declare const CMD_SBDWB: ATCmd.ContextWrapper<Modem>;
