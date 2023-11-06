import { LeveledLogMethod, Logger } from "winston";
interface CustomLogger extends Logger {
    success: LeveledLogMethod;
    setLevel: (lvl: number | string) => CustomLogger;
}
declare const logger: CustomLogger;
export declare function disableTTY(): CustomLogger;
export declare function setLevel(targetLevel: number | string): CustomLogger;
export declare function create(moduleName?: string): CustomLogger;
export declare function setProgramName(name: string): void;
export default logger;
