import nodemailer from "nodemailer";


import { MOTransport } from ".";
import { GSS } from "../index";

export class SMTPTransport extends MOTransport {

  private transporter: nodemailer.Transporter;
  private readonly options: SMTPTransport.Options;

  constructor( options: SMTPTransport.Options ) {
    super();
    this.options = options;
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      auth: {
        user: options.user,
        pass: options.password,
      }
    });

  }

  private getStatusFromMsg( msg: MOTransport.Message ): string {
    const stsText = {
      [GSS.Session.Status.TRANSFER_OK]: 'Transfer OK',
      [GSS.Session.Status.MT_MSG_TOO_LARGE]: 'MT Message Too Large',
      [GSS.Session.Status.SBD_TIMEOUT]: 'SBD Timeout',
      [GSS.Session.Status.MO_MSG_TOO_LARGE]: 'MO Message Too Large',
      [GSS.Session.Status.INCOMPLETE_TRANSFER]: 'Incomplete Transfer',
      [GSS.Session.Status.SBD_PROTOCOL_ERROR]: 'SBD Protocol Error',
      [GSS.Session.Status.SBD_DENIAL]: 'SBD Denial',
    };
    return `${ 
      String( msg.sessionStatus ).padStart( 2, '0' ) 
    } - ${ stsText[ msg.sessionStatus ] }`
  }

  private getTextFromMsg( msg: MOTransport.Message ): string {

    return  `MOMSN: ${ msg.momsn }\n`
          + `MTMSN: ${ msg.mtmsn }\n`
          + `Time of Session (UTC): ${
              msg.sessionTime.utc().format( 'ddd MMM D HH:mm:ss YYYY' ) 
            }\n`
          + `${ this.getStatusFromMsg( msg ) }\n`
          + `Message Size (bytes): ${ msg.payload.length }\n\n`
          + `Unit Location: Lat = ${
              msg.unitLocation.coord[ 0 ].toFixed( 5 ) 
            } Long = ${ 
              msg.unitLocation.coord[ 1 ].toFixed( 5 ) 
            }\n`
          + `CEPRadius = ${ msg.unitLocation.cepRadius.toFixed( 0 ) }`;

  }

  private getSubjectFromMsg( msg: MOTransport.Message ): string {
    return `SBD Msg From Unit: ${ msg.imei }`;
  }

  private getFilenameFromMsg( msg: MOTransport.Message ): string {
    return `${ msg.imei }_${ 
      String( msg.momsn ).padStart( 6, '0' ) 
    }.sbd`;
  }

  sendMessage( msg: MOTransport.Message ): Promise<MOTransport.Message> {

    return this.transporter.sendMail({

      text: this.getTextFromMsg( msg ),
      to: this.options.to || this.options.user,
      subject: this.getSubjectFromMsg( msg ),
      attachments: [{
        filename: this.getFilenameFromMsg( msg ),
        content: msg.payload
      }]

    }).then( () => msg );

  }

}

export namespace SMTPTransport { 
  export interface Options {
    host: string;
    port?: number;
    user: string;
    password?: string;
    to?: string;
  }
 }