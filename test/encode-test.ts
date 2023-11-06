import { 
	IE_H_LEN, 
	IE_MO_HEADER_LEN, 
	IE_MO_LOCATION_LEN, 
	MSG_H_LEN, 
	Message 
} from '../src/gss/msg';
import moment from 'moment';
import { GSS } from '../src/gss';
import { encodeMoMsg } from '../src/gss/msg/encoder';

describe( 'ISBD Direct IP message encoding tests', () => {
  
  const moMsgPayload = Buffer.from( "This is a test message" );

  const moMsg: Message.MO = {
    header: {
      cdr: 0,
      imei: "000000000000000",
      status: 0,
      momsn: 15,
      mtmsn: 25,
      time: moment()
    },
    location: GSS.generateUnitLocation(),
    payload: {
      payload: moMsgPayload,
    }
  }

  test( 'MO message length', () => {

    const encoded = encodeMoMsg( moMsg );
    
    expect( encoded.length )
      .toBe( 
        MSG_H_LEN 
        + IE_H_LEN + IE_MO_HEADER_LEN 
        + IE_H_LEN + IE_MO_LOCATION_LEN
        + IE_H_LEN + moMsgPayload.length );

  })

});
