import moment, { Moment } from "moment";
import type { GSS } from "../index";

export abstract class Transport {

  abstract sendSessionMessage(
    msg: Transport.SessionMessage 
  ): Promise<Transport.SessionMessage>;

  abstract sendBuffer( buffer: Buffer ): Promise<Buffer>;

}

export namespace Transport {

  export interface SessionMessage {
    imei: string;
    momsn: number;
    mtmsn: number;
    payload: Buffer;
    time: Moment;
    status: GSS.Session.Status;
    location: GSS.UnitLocation;
  }

}

// TODO: create FILE transport
