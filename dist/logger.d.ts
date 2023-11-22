import { Logger } from "winston";
interface CustomLogger extends Logger {
    setLevel: (lvl: number | string) => CustomLogger;
}
export declare const levels: {
    [key: string]: number;
};
declare const logger: CustomLogger;
export declare function disableTTY(): CustomLogger;
export declare function setLevel(targetLevel: number | string): CustomLogger;
export declare function create(moduleName: string): CustomLogger;
export default logger;
