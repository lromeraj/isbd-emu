import moment from "moment";
import nodemailer from "nodemailer";
import { MOTransport } from ".";
import { sprintf } from "sprintf-js";
import Mail from "nodemailer/lib/mailer";

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

  private getTextFromMsg( msg: MOTransport.Message ): string {

    return  `MOMSN: ${ msg.momsn }\n`
          + `MTMSN: ${ msg.mtmsn }\n`
          + `Time of Session (UTC): ${
              msg.sessionTime.utc().format( 'ddd MMM D HH:mm:ss YYYY' ) 
            }\n`
          + `Session Status: 00 - Transfer OK\n`
          + `Message Size (bytes): ${ msg.payload.length }\n\n`
          + `Unit Location: Lat = ${
              msg.unitLocation[ 0 ].toFixed( 5 ) 
            } Long = ${ 
              msg.unitLocation[ 1 ].toFixed( 5 ) 
            }\n`
          + `CEPRadius = ${ msg.cepRadius.toFixed( 0 ) }`;

  }

  private getSubjectFromMsg( msg: MOTransport.Message ): string {
    return `SBD Msg From Unit: ${ msg.imei }`;
  }

  private getFilenameFromMsg( msg: MOTransport.Message ): string {
    return `${ msg.imei }_${ 
      String(msg.momsn).padStart( 6, '0' ) 
    }.sbd`;
  }

  protected sendMessage( msg: MOTransport.Message ): Promise<MOTransport.Message> {

    if ( msg.payload.length > 0 ) {
    
      return this.transporter.sendMail({
    
        text: this.getTextFromMsg( msg ),
        to: this.options.to || this.options.user,
        from: this.options.from || this.options.user,
        subject: this.getSubjectFromMsg( msg ),
        attachments: [{
          filename: this.getFilenameFromMsg( msg ),
          content: msg.payload
        }]

      }).then( () => msg );
    
    }

    return Promise.resolve( msg );

  }

}

export namespace SMTPTransport { 
  export interface Options {
    host: string;
    port?: number;
    user: string;
    password?: string;
    from?: string;
    to?: string;
  }
 }