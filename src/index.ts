import * as msg from "./gss/msg"
import * as decoder from "./gss/msg/decoder"
import * as encoder from "./gss/msg/encoder"

import { TCPTransport } from "./gss/transport/tcp"
import { SMTPTransport } from "./gss/transport/smtp"

export namespace GSS {
  
  export const Decoder = decoder
  export const Encoder = encoder

  export import Message = msg.Message;
  
  export namespace Transport {  
    export const TCP = TCPTransport;
    export const SMTP = SMTPTransport;
  }
  
}