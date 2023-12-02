import Wire from '../Wire';
import { Extensions } from '../Types';
import bencode from 'bencode';
const debug = require('debug')('ut_metadata');

const PIECE_LENGTH = 1 << 14 // 16 KiB

export default class UtMetadata extends Extensions {
  
  // _name: string = 'ut_metadata';
  // name = 'ut_metadata';
  _wire: Wire;

  constructor(wire: Wire) {
    super('ut_metadata');
    this._wire = wire;
  }

  onMessage(buf: Buffer) {
    // super.onMessage();
    let dict;
    let trailer;
    try {
      const str = buf.toString();
      const trailerIndex = str.indexOf('ee') + 2;
      dict = bencode.decode(str.substring(0, trailerIndex));
      trailer = buf.slice(trailerIndex);
    } catch(err) {
      // drop invalid messages
      return;
    }

    switch(dict.msg_type) {
      case 0:
        // ut_metadata request (from peer)
        // example: { 'msg_type': 0, 'piece': 0 }
        this._onRequest(dict.piece);
        break;
      case 1:
        // ut_metadata data (in response to our request)
        // example: { 'msg_type': 1, 'piece': 0, 'total_size': 3425 }
        this._onData(dict.piece, trailer, dict.total_size);
        break;
      case 2:
        // ut_metadata reject (peer doesn't have piece we requested)
        // { 'msg_type': 2, 'piece': 0 }
        this._onReject(dict.piece);
        break;
    }
  }

  _onRequest(piece) {

  }

  _onData(piece, buf, totalSize) {

  }

  _onReject(piece) {

  }

}
