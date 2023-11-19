import stream from 'readable-stream';
const debug = require('debug')('bittorrent-protocol');

const MESSAGE_PROTOCOL = Buffer.from('\u0013BitTorrent protocol')

const MESSAGE_RESERVED = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

export default class Wire extends stream.Duplex {

  type: string;
  _handshakeSent: boolean = false;

  constructor(type) {
    super();
    this.type = type;
  }

  /**
   * Message: "handshake" <pstrlen><pstr><reserved><info_hash><peer_id>
   * @param {Buffer|string} infoHash 
   * @param {Buffer|string} peerId 
   */
  handshake(infoHash: Buffer|string, peerId: Buffer|string) {

    let infoHashBuffer;
    let peerIdBuffer;
    if(typeof infoHash === 'string') {
      infoHash = infoHash.toLowerCase();
      infoHashBuffer = Buffer.from(infoHash, 'hex');
    } else {
      infoHashBuffer = infoHash;
      infoHash = infoHashBuffer.toString('hex');
    }
    if(typeof peerId === 'string') {
      peerIdBuffer = Buffer.from(peerId, 'hex');
    } else {
      peerIdBuffer = peerId;
      peerId = peerIdBuffer.toString('hex');
    }

    if(infoHashBuffer.length !== 20 || peerIdBuffer.length !== 20) {
      throw new Error('infoHash and peerId MUST have length 20');
    }

    const reserved = Buffer.from(MESSAGE_RESERVED);

    this._push(Buffer.concat([MESSAGE_PROTOCOL, reserved, infoHashBuffer, peerIdBuffer]));
    this._handshakeSent = true;
  }

  _push(data): boolean {
    return super.push(data);
  }

  _buffer = [];
  _bufferSize: number = 0;

  _parserSize = 0;
  _parser = null;

  /**
   * Duplex stream method. Called whenever the remote peer has data for us.
   */
  _write(data, encoding, cb) {
    this._bufferSize += data.length;
    this._buffer.push(data);
    if(this._buffer.length > 1)
      this._buffer = [Buffer.concat(this._buffer, this._bufferSize)];

    // now this.buffer is an array containing a single Buffer
    while(this._bufferSize >= this._parserSize) {
      if(this._parserSize === 0) {
        this._parser(Buffer.from([]));
      } else {
        const buffer = this._buffer[0];
        this._bufferSize -= this._parserSize;
        this._buffer = this._bufferSize
          ? [buffer.slice(this._parserSize)]
          : [];
        this._parser(buffer.slice(0, this._parserSize));
      }
    }

    cb(null); // Signal that we're ready for more data
  }

  /**
   * 
   * @param {number} size 
   * @param {Function} parser 
   */
  _parse(size: number, parser: Function) {
    this._parserSize = size;
    this._parser = parser;
  }

}
