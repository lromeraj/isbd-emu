import nodemailer from "nodemailer";


import { Transport } from ".";
import { GSS } from "../index";
import Mail from "nodemailer/lib/mailer";
import { Message } from "../msg";

export class SMTPTransport extends Transport {

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
        pass: options.password || '',
      }
    });

  }


  sendBuffer( buffer: Buffer ): Promise<Buffer> {
    return Promise.resolve( Buffer.from([]) );
  }

  private getStatusFromMsg( msg: Transport.SessionMessage ): string {
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
      String( msg.status ).padStart( 2, '0' ) 
    } - ${ stsText[ msg.status ] }`
  }

  private getTextFromMsg( msg: Transport.SessionMessage ): string {

    const decDeglocation = Message.getDDLocation( msg.location );

    return  `MOMSN: ${ msg.momsn }\n`
          + `MTMSN: ${ msg.mtmsn }\n`
          + `Time of Session (UTC): ${
              msg.time.utc().format( 'ddd MMM D HH:mm:ss YYYY' ) 
            }\n`
          + `${ this.getStatusFromMsg( msg ) }\n`
          + `Message Size (bytes): ${ msg.payload.length }\n\n`
          + `Unit Location: Lat = ${
              decDeglocation.latitude.toFixed( 5 )
            } Long = ${ 
              decDeglocation.longitude.toFixed( 5 )
            }\n`
          + `CEPRadius = ${ msg.location.cepRadius.toFixed( 0 ) }`;

  }

  private getSubjectFromMsg( msg: Transport.SessionMessage ): string {
    return `SBD Msg From Unit: ${ msg.imei }`;
  }

  private getFilenameFromMsg( msg: Transport.SessionMessage ): string {
    return `${ msg.imei }_${
      String( msg.momsn ).padStart( 6, '0' ) 
    }.sbd`;
  }

  sendSessionMessage( 
    msg: Transport.SessionMessage 
  ): Promise<Transport.SessionMessage> {

    const mailOpts: Mail.Options = {
      text: this.getTextFromMsg( msg ),
      to: this.options.to || this.options.user,
      subject: this.getSubjectFromMsg( msg ),
    }

    if ( msg.payload.length > 0 ) {
      mailOpts.attachments = [{
        filename: this.getFilenameFromMsg( msg ),
        content: msg.payload
      }]
    }

    return this.transporter.sendMail( mailOpts )
      .then( () => msg );

  }

}

export namespace SMTPTransport { 
  export interface Options {
    host: string;
    port: number;
    user: string;
    password?: string;
    to?: string;
  }
 }