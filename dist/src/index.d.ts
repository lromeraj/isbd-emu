import * as msg from "./gss/msg";
import * as decoder from "./gss/msg/decoder";
import * as encoder from "./gss/msg/encoder";
import { TCPTransport } from "./gss/transport/tcp";
import { SMTPTransport } from "./gss/transport/smtp";
export declare namespace GSS {
    const Decoder: typeof decoder;
    const Encoder: typeof encoder;
    export import Message = msg.Message;
    namespace MessageUtils {
    }
    namespace Transport {
        const TCP: typeof TCPTransport;
        const SMTP: typeof SMTPTransport;
    }
}
