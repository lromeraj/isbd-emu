import moment, { Moment } from "moment";
import * as fastq from "fastq";
import type { queue, done, queueAsPromised } from "fastq";
import logger from "../../logger";

export abstract class MOTransport {

  private queue: queueAsPromised<MOTransport.Message>;

  constructor() {
    this.queue = fastq.promise( async msg => {
      return this.sendMessage( msg )
    }, 1 );
  }

  protected abstract sendMessage( 
    msg: MOTransport.Message 
  ): Promise<MOTransport.Message>;

  enqueueMessage( msg: MOTransport.Message ): Promise<void> {
    return this.queue.push( msg );
  }

}

export namespace MOTransport {
  export interface Message {
    momsn: number; 
    mtmsn: number;
    imei: string;
    payload: Buffer;
    cepRadius: number;
    sessionTime: Moment;
    unitLocation: [ number, number ];
  }
}