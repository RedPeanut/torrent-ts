import stream from 'readable-stream';
import randombytes from 'randombytes';
import bencode from 'bencode';
import { Extensions } from './Types';
const debug = require('debug')('wire');

const KEEP_ALIVE_TIMEOUT = 55000;

const MESSAGE_PROTOCOL = Buffer.from('\u0013BitTorrent protocol');

const MESSAGE_RESERVED = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

export default class Wire extends stream.Duplex {

  type: string;
  _handshakeSent: boolean = false;

  constructor(type) {
    super();
    this._debugId = randombytes(4).toString('hex');
    this.type = type;
    this._parseHandshake();
  }

  _parseHandshake() {
    this._parse(1, buffer => {
      const pstrlen = buffer.readUInt8(0);
      if(pstrlen !== 19) {
        this._debug('Error: wire not speaking BitTorrent protocol (%s)', pstrlen.toString());
        this.end();
        return;
      }
      this._parse(pstrlen + 48, this._onHandshakeBuffer);
    });
  }

  _onHandshakeBuffer(handshake) {
    const protocol = handshake.slice(0, 19);
    if (protocol.toString() !== 'BitTorrent protocol') {
      this._debug('Error: wire not speaking BitTorrent protocol (%s)', protocol.toString());
      this.end();
      return;
    }
    handshake = handshake.slice(19);
    this._onHandshake(handshake.slice(8, 28), handshake.slice(28, 48), {
      dht: !!(handshake[7] & 0x01), // see bep_0005
      fast: !!(handshake[7] & 0x04), // see bep_0006
      extended: !!(handshake[5] & 0x10) // see bep_0010
    });
    this._parse(4, this._onMessageLength);
  }

  peerId: string;
  peerIdBuffer: Buffer;
  peerExtensions: {};

  _onHandshake(infoHashBuffer, peerIdBuffer, extensions) {
    const infoHash = infoHashBuffer.toString('hex');
    const peerId = peerIdBuffer.toString('hex');

    this._debug('got handshake i=%s p=%s exts=%o', infoHash, peerId, extensions);

    this.peerId = peerId;
    this.peerIdBuffer = peerIdBuffer;
    this.peerExtensions = extensions;

    this.emit('handshake', infoHash, peerId, extensions);
  }

  /**
   * 
   * @param {Buffer} buffer
   */
  _onMessageLength(buffer: Buffer) {
    const length = buffer.readUInt32BE(0);
    if(length > 0) {
      this._parse(length, this._onMessage);
    } else {
      this._onKeepAlive();
      this._parse(4, this._onMessageLength);
    }
  }

  _onKeepAlive() {
    this._debug('got keep-alive');
    this.emit('keep-alive');
  }

  _onExtended(ext: number, buf: Buffer) {
    if(ext == 0) {
      let info;
      try {
        bencode.decode(buf);
      } catch(err) {
        this._debug('ignoring invalid extended handshake: %s', err.message || err);
      }
    } else {
      if(this.extendedMapping[ext]) {
        let extensionName = this.extendedMapping[ext]; // friendly name for extension
        if(this._ext[extensionName]) {
          // there is an registered extension handler, so call it
          this._ext[extensionName].onMessage(buf);
        }
        this._debug('got extended message ext=%s', extensionName);
        this.emit('extended', extensionName, buf);
      }
    }
  }

  /**
   * Handle a message from the remote peer.
   * @param {Buffer} buffer 
   */
  _onMessage(buffer: Buffer) {
    this._parse(4, this._onMessageLength);
    switch(buffer[0]) {
      case 20:
        return this._onExtended(buffer.readUint8(1), buffer.slice(2));
      default:
        this._debug('got unknown message');
        return this.emit('unknownmessage', buffer);
    }
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

  _keepAliveInterval: NodeJS.Timer = null;

  /**
   * sent every 55s
   * @param {boolean} enable 
   */
  setKeepAlive(enable: boolean) {
    clearInterval(this._keepAliveInterval);
    this._keepAliveInterval = setInterval(() => {
      this._onKeepAlive();
    }, KEEP_ALIVE_TIMEOUT);
  }

  _ext: { string: any }; // string -> instance
  _nextExt: number = 1;
  extendedMapping: [string];

  /**
   * 
   * @param {extends Extensions} extension 
   */
  use<Type extends Extensions>(extension: Type) {
    const name = extension.name;
    // const name = extension.prototype.name;
    this._debug('use extension.name=%s', name);
    const ext = this._nextExt;
    const handler = extension; //new extension(this);

    function noop() {}

    if(typeof handler.onHandshake !== 'function')
      handler.onHandshake = noop;
    if(typeof handler.onExtendedHandshake !== 'function')
      handler.onExtendedHandshake = noop;
    if(typeof handler.onMessage !== 'function')
      handler.onMessage = noop;

    this.extendedMapping[ext] = name;
    this._ext[name] = handler;
    this[name] = handler;

    this._nextExt += 1;
  }

  destroy() {
    if(this.destroyed) return;
    this.destroyed = true;
    this._debug('destroy');
    this.emit('close');
    this.end();
    return this;
  }

  end(...args) {
    this._debug('end');
    // this._onUninterested();
    // this._onChoke();
    return super.end(...args)
  }

  _debugId;
  _debug(...args) {
    args[0] = `[${this._debugId}] ${args[0]}`
    debug(...args)
  }

}
