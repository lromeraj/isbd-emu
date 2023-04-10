import moment, { Moment } from "moment";

import logger from "../../logger";
import type { GSS } from "../gss";

export abstract class MOTransport {

  constructor() { }

  abstract sendMessage( 
    msg: MOTransport.Message 
  ): Promise<MOTransport.Message>;

}

export namespace MOTransport {

  export namespace Message {
    
    export interface UnitLocation {
      coord: [ number, number ];
      cepRadius: number;
    }

  }
  export interface Message {
    imei: string;
    momsn: number; 
    mtmsn: number;
    payload: Buffer;
    sessionTime: Moment;
    sessionStatus: GSS.Session.Status;
    unitLocation: Message.UnitLocation;
  }
}