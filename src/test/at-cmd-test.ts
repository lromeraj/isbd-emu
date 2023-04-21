import { ATCmd } from '../at/cmd';
import { SerialPort } from 'serialport';
import { ATInterface } from '../at/interface';
import { CMD_AT, CMD_ECHO, CMD_VERBOSE } from '../at/commands';

describe( 'AT Interface command test', () => {
  
  // logger.transports.forEach( t => t.silent = true )

  const atInterface = new ATInterface({
    path: null,
    baudRate: 19200,
  });

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
    expect( atInterface.echo ).toBeFalsy()
    
    expectCmd( CMD_ECHO, 'ate0\r' ).toBeTruthy()
    expect( atInterface.echo ).toBeFalsy()
    
    expectCmd( CMD_ECHO, 'ate1\r' ).toBeTruthy()
    expect( atInterface.echo ).toBeTruthy()

    expectCmd( CMD_ECHO, 'ate1o\r' ).toBeUndefined()
  })

  test( 'AT verbose', () => {
    expectCmd( CMD_VERBOSE, 'atv0\r' ).toBeTruthy()
    expect( atInterface.verbose ).toBeFalsy()
    
    expectCmd( CMD_VERBOSE, 'atv\r' ).toBeTruthy()
    expect( atInterface.verbose ).toBeFalsy()
  })

});
