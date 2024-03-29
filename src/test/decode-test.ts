import moment from 'moment';
import { GSS } from '../gss';
import { Message } from '../gss/msg';
import { encodeMoMsg } from '../gss/msg/encoder';
import { decodeMoMessage } from '../gss/msg/decoder';

describe( 'Iridium SBD Direct IP message decoding test', () => {
  
  const sampleData = {
    imei: "105170868074050",
    location: GSS.generateUnitLocation(),
    payload: Buffer.from( "This is a test message" ),
  };

  test( 'MO message bijection test', () => {

    const moMsg: Message.MO = {
      header: {
        cdr: 0,
        imei: sampleData.imei,
        status: 0,
        momsn: 0,
        mtmsn: 0,
        time: moment()
      },
      location: sampleData.location,
      payload: {
        payload: sampleData.payload,
      }
    }

    let oldDecodedMsg = moMsg;

    for ( let i=0; i < 10; i++ ) {
      const moEncoded = encodeMoMsg( oldDecodedMsg );
      const moDecoded = decodeMoMessage( moEncoded );
      
      expect( moDecoded ).toBeTruthy();
      
      if ( moDecoded ) {
        oldDecodedMsg = moDecoded
      }

    }
    
    expect( oldDecodedMsg.header?.imei ).toBe( sampleData.imei )
    expect( oldDecodedMsg.location?.cepRadius ).toBe( sampleData.location.cepRadius );

    expect( oldDecodedMsg.location?.lat ).toStrictEqual( sampleData.location.lat );
    expect( oldDecodedMsg.location?.lon ).toStrictEqual( sampleData.location.lon );

  })

});
