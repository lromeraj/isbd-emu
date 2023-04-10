import net, { Socket } from "net";
import { MOTransport } from ".";

export class TCPTransport extends MOTransport {

  private socket: Socket;

  constructor( options: TCPTransport.Options ) {
    super();
    this.socket = new net.Socket();
  }

  sendMessage( msg: MOTransport.Message ): Promise<MOTransport.Message> {
    return Promise.reject();
  }

}

export namespace TCPTransport {
  export interface Options {
    port: number;
    hostname: string;
  }
}