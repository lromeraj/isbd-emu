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

  const atInterface = new ATInterface( sp );

  const expectCmd = ( 
    cmd: ATCmd<any>, cmdStr: string
  ) => { 
    return expect( cmd.test( atInterface, cmdStr ) )
  }

  test( 'AT test', () => {
    expectCmd( CMD_AT, 'at\r' ).toBeTruthy();
    expectCmd( CMD_AT, 'AT\r' ).toBeTruthy();
    expectCmd( CMD_AT, 'a\r' ).toBeUndefined();
    expectCmd( CMD_AT, 't\r' ).toBeUndefined();
    expectCmd( CMD_AT, '\r' ).toBeUndefined();
  });
  
  test( 'AT echo', () => {
    expectCmd( CMD_ECHO, 'ate\r' ).toBeTruthy()
    expectCmd( CMD_ECHO, 'ate0\r' ).toBeTruthy()
    expectCmd( CMD_ECHO, 'ate1\r' ).toBeTruthy()
    expectCmd( CMD_ECHO, 'ate1o\r' ).toBeUndefined()
  })

  test( 'AT verbose', () => {
    expectCmd( CMD_VERBOSE, 'atv0\r' ).toBeTruthy()
    expectCmd( CMD_VERBOSE, 'atv1\r' ).toBeTruthy()
    expectCmd( CMD_VERBOSE, 'atevp\r' ).toBeUndefined()
  })

});
