import { ATCmd } from '../at/cmd';
import { SerialPort } from 'serialport';
import { ATInterface } from '../at/interface';

describe('ATCmd module', () => {

  const sp = new SerialPort({
    path: '/dev/null',
    baudRate: 19200,
    autoOpen: false,
  });

  const atInterface = new ATInterface( sp );

  test( 'Testing basic AT command', () => {

    const cmd = new ATCmd()
      .onExec( null, async () => { })

    expect( cmd.test( atInterface, 'a' ) ).toBeUndefined()
    expect( cmd.test( atInterface, 'at' ) ).toBeTruthy()
    expect( cmd.test( atInterface, 'ate' ) ).toBeUndefined()
  
  });

});
