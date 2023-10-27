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

describe('description', () => {
  it('testcase', () => {

    let id = toBuffer(randombytes(20));
    let socket = new Socket({});
    let pending = 0;

    function cb(err, res, peer) {
      console.log('cb() is called...');
      console.log('err =', err);
      console.log('res =', res);
      console.log('peer =', peer);
      pending--;

      if(!pending) {
        process.nextTick(done);
      }
    }

    function done() {
      socket.destroy(null);
      expect(1).toBe(1);
    }

    BOOTSTRAP_NODES.forEach((peer) => {
      pending++;
      socket.query(peer, { q: 'get_peers', a: { info_hash: target } }, cb);
    });
    
  });

  // it('testcase', () => {
  //   let id = toBuffer(randombytes(20));
  //   let socket = new Socket({});
  //   socket.query({}, { q: 'find_node', a: { id: id, target: target } }, () => {});

  //   function cb(err, res, peer) {
  //     console.log('cb() is called...');
  //     console.log('err =', err);
  //     console.log('res =', res);
  //     console.log('peer =', peer);
  //   }
    
  //   socket.query({ host: 'router.bittorrent.com', port: 6881 }, { q: 'find_node', a: { id: id, target: id } }, cb);
  //   socket.query({ host: 'router.utorrent.com', port: 6881 }, { q: 'find_node', a: { id: id, target: id } }, cb);
  //   socket.query({ host: 'dht.transmissionbt.com', port: 6881 }, { q: 'find_node', a: { id: id, target: id } }, cb);

  //   expect(1).toBe(1);
  // });
});

function toBuffer(str) {
  if(Buffer.isBuffer(str)) return str
  if(ArrayBuffer.isView(str)) return Buffer.from(str.buffer, str.byteOffset, str.byteLength)
  if(typeof str === 'string') return Buffer.from(str, 'hex')
  throw new Error('Pass a buffer or a string')
}