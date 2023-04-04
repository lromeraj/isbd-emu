import { ATCmd } from '../at/cmd';
import { SerialPort } from 'serialport';
import { ATInterface } from '../at/interface';
import { CMD_AT, CMD_ECHO, CMD_VERBOSE } from '../at/commands';

describe('AT command RegExp test', () => {
  
  // logger.transports.forEach( t => t.silent = true )

  const sp = new SerialPort({
    path: '/dev/null',
    baudRate: 19200,
    autoOpen: false,
  });

  const atInterface = new ATInterface( sp, undefined );

  const expectCmd = ( 
    cmd: ATCmd, cmdStr: string
  ) => { 
    return expect( cmd.test( atInterface, cmdStr, undefined ) )
  }

  test( 'AT test', () => {
    expectCmd( CMD_AT, 'at' ).toBeTruthy();
    expectCmd( CMD_AT, 'AT' ).toBeTruthy();
    expectCmd( CMD_AT, 'a' ).toBeUndefined();
    expectCmd( CMD_AT, 't' ).toBeUndefined();
  });
  
  test( 'AT echo', () => {
    expectCmd( CMD_ECHO, 'ate' ).toBeTruthy()
    expectCmd( CMD_ECHO, 'ate0' ).toBeTruthy()
    expectCmd( CMD_ECHO, 'ate1' ).toBeTruthy()
    expectCmd( CMD_ECHO, 'ate1o' ).toBeUndefined()
  })

  test( 'AT verbose', () => {
    expectCmd( CMD_VERBOSE, 'atv0' ).toBeTruthy()
    expectCmd( CMD_VERBOSE, 'atv1' ).toBeTruthy()
    expectCmd( CMD_VERBOSE, 'atevp' ).toBeUndefined()
  })

});
