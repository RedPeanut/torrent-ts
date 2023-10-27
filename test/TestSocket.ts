import * as dgram from 'dgram';
import * as bencode from 'bencode';

class TestSocket {

  constructor() {}

  main(args: []): void {
    let socket = dgram.createSocket('udp4');
    socket.on('message', _onmessage);
    socket.on('error', _onerror);
    socket.on('listening', onlistening);

    function _onerror(err) {
      console.log('_onerror() is called...');
    }

    function onlistening() {
      console.log('onlistening() is called...');
    }

    function _onmessage(buf, rinfo) {
      console.log('_onmessage() is called...');
      let message = bencode.decode(buf);
      let type = message && message.y && message.y.toString();
      console.log('type =', type);
      if(type === 'r' || type === 'e') { // 
      } else if(type === 'q') { // 
      } else { // 
      }
    }

    function query(peer, query, cb) {
      let message = {
        t: Buffer.allocUnsafe(2),
        y: 'q',
        q: query.q,
        a: query.a
      }
      send(peer, message);
    }

    function send(peer, message, cb?) {
      let buf = bencode.encode(message);
      this.socket.send(buf, 0, buf.length, peer.port, peer.address || peer.host, cb || noop);
    }

    function noop() {}

    

  }

}

new TestSocket().main([]);


