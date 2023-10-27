import Socket from '../src/Socket';
import randombytes from 'randombytes';
import magnet from 'magnet-uri';

const captain = 'magnet:?xt=urn:btih:2ae7f9a05790e713f7c753af931e32d138ce2a61'; // 캡틴아메리카 윈터솔져
const parsed = magnet(captain);
const target = Buffer.from(parsed.infoHash, 'hex');

const BOOTSTRAP_NODES = [
  { host: 'router.bittorrent.com', port: 6881 },
  { host: 'router.utorrent.com', port: 6881 },
  { host: 'dht.transmissionbt.com', port: 6881 }
];

class TestBootstrap {

  constructor() {}

  main(args: []): void { 
    // console.log('main() is called...');
    let socket = new Socket({});
    // socket.bind(0, function() {
    //   let port = socket.address().port;
    // });
    socket.setMaxListeners(0);
    socket.on('query', onquery);
    socket.on('response', onresponse);
    socket.on('message', _onmessage);
    socket.on('warning', onwarning);
    socket.on('error', _onerror);
    socket.on('update', onupdate);
    socket.on('listening', onlistening);

    function onupdate() {
      console.log('onupdate() is called...');
    }

    function _onerror(err) {
      console.log('_onerror() is called...');
    }

    function onlistening() {
      console.log('onlistening() is called...');
    }

    function onwarning(err) {
      console.log('onwarning() is called...');
    }

    function onquery(query, peer) {
      console.log('onquery() is called...');
    }

    function onresponse(reply, peer) {
      console.log('onresponse() is called...');
    }

    function _onmessage(reply, peer) {
      console.log('_onmessage() is called...');
    }

    let id = this.toBuffer(randombytes(20));
    let pending = 0;

    function cb(err, res, peer) {
      console.log('cb() is called...');
      console.log('err =', err, ', res=', res, ', peer=', peer);

      if(!pending) {
        process.nextTick(done);
      }
    }

    function done() {
      socket.destroy(null);
      // expect(1).toBe(1);
    }

    BOOTSTRAP_NODES.forEach((peer) => {
      pending++;
      socket.query(peer, { q: 'get_peers', a: { id: id, info_hash: target } }, cb);
    });

    // BOOTSTRAP_NODES.forEach((peer) => {
    //   pending++;
    //   socket.query(peer, { q: 'find_node', a: { id: id, target: target } }, cb);
    // });
  }

  toBuffer(str) {
    if(Buffer.isBuffer(str)) return str
    if(ArrayBuffer.isView(str)) return Buffer.from(str.buffer, str.byteOffset, str.byteLength)
    if(typeof str === 'string') return Buffer.from(str, 'hex')
    throw new Error('Pass a buffer or a string')
  }

}

new TestBootstrap().main([]);


