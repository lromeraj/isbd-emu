import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";

program
  .version( '0.0.1' )
  .description( 'A simple emulator for Iridium SBD 9602/9602 transceivers' )

program.addOption( 
  new Option( '-p, --path <string>', 'Serial port path' ).makeOptionMandatory() )


class ISBD9602 {

}

async function main() {
  
  program.parse();

  const opts = program.opts();

  const serialport = new SerialPort({ 
    path: opts.path, 
    baudRate: 19200, 
    autoOpen: true 
  })

  serialport.on( 'data', (data: Buffer) => {
    console.log( data )
    if ( data.indexOf( 13 ) > -1 ) {
      serialport.write( '\r\nOK\r\n' );
    }
  })
  
  // serialport.close();
}

main();


