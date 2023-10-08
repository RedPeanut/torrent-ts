const socket = require('../src/Socket');

class TestSocket {

  constructor() {}

  run(args: []): void { 
    console.log('main() is called...');
    let _socket = new socket.default({});
    // socket.bind(0, function() {
    //   let port = socket.address().port;
    // });
    _socket.setMaxListeners(0);
    _socket.on('query', onquery);
    _socket.on('response', onresponse);
    // _socket.on('message', _onmessage);
    _socket.on('warning', onwarning);
    _socket.on('error', _onerror);
    _socket.on('update', onupdate);
    _socket.on('listening', onlistening);

    function onupdate() {
      console.log('onupdate() is called...');
    }

    function _onerror(err) {
      console.log('onerror() is called...');
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

    // function _onmessage(reply, peer) {
    //   console.log('onmessage() is called...');
    // }

    const BOOTSTRAP_NODES = [
      { host: 'router.bittorrent.com', port: 6881 },
      { host: 'router.utorrent.com', port: 6881 },
      { host: 'dht.transmissionbt.com', port: 6881 }
    ];

    const randombytes = require('randombytes');
    const id = randombytes(20);

    function cb(err, res, peer) {
      console.log('cb() is called...');
      console.log('err =', err);
      console.log('res =', res);
      console.log('peer =', peer);
    }

    _socket.query({ host: 'router.bittorrent.com', port: 6881 }, { q: 'find_node', a: { id: id, target: id } }, cb);
    _socket.query({ host: 'router.utorrent.com', port: 6881 }, { q: 'find_node', a: { id: id, target: id } }, cb);
    _socket.query({ host: 'dht.transmissionbt.com', port: 6881 }, { q: 'find_node', a: { id: id, target: id } }, cb);
  }
}

new TestSocket().run([]);


