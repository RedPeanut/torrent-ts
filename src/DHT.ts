// const { EventEmitter } = require('events');
import { EventEmitter } from 'events';
import Rpc from './Rpc';
import Util from './Util';
const debug = require('debug')('dht');

interface Options {

}

export default class DHT extends EventEmitter {

  // rpc: typeof Rpc;
  rpc: Rpc;
  nodeId: Buffer;

  constructor(opts: Options) {
    super();
    this.rpc = new Rpc({});
  }

  announce(infoHash, port, cb) {
    const message = {
      q: 'announce_peer',
      a: {
        id: this.rpc.id,
        token: null, // queryAll sets this
        info_hash: infoHash,
        port,
        implied_port: port ? 0 : 1
      }
    };
    this._debug('announce %s %d', infoHash, port);
    this.rpc.queryAll(this.rpc.nodes.closest(infoHash), message, null, cb);
  }

  lookup(infoHash, cb) {
    // let _infoHash = toBuffer(infoHash);
    const self = this;
    // const parsed = magnet(infoHash);
    const target = Buffer.from(infoHash, 'hex');

    this.rpc.on('query', function(query, peer) {
      // debug(query, peer);
      // console.trace();
      if(query.q === undefined || query.q === null) return;
      const q = query.q.toString();
      debug('received %s query from %s:%d', q, peer.address, peer.port);
    });

    /* _rpc.on('response', function(message, rinfo) {
      if(message) {
        if(message.ip) debug('message.ip =', message.ip.toString());
        if(message.t) debug('message.t =', message.t.toString());
        if(message.y) debug('message.y =', message.y.toString());
      }
      debug('rinfo =', rinfo);
    }); */

    let then = Date.now();

    // get_peers with bootstrap node
    this.rpc.bootstrap(this.rpc.id, { q: 'get_peers', a: { id: self.rpc.id, info_hash: target } }, function(err, numberOfReplies) {
    // _rpc.bootstrap(_rpc.id, { q: 'find_node', a: { id: _rpc.id, target: target } }, function(err, numberOfReplies) {
      debug('(bootstrap)', Date.now() - then, 'ms, numberOfReplies =', numberOfReplies);
      // debug(require('util').inspect(_rpc.nodes.root, false, null))

      // _rpc.destroy(() => {
      //   debug('destroy callback is called...');
      // });

      then = Date.now();

      // get_peers
      self.rpc.getPeers(target, { q: 'get_peers', a: { id: self.rpc.id, info_hash: target } }, visit, function(err, numberOfReplies) {
        // console.trace();
        debug('(getPeers)', Date.now() - then, 'ms, numberOfReplies =', numberOfReplies);
        // debug(require('util').inspect(_rpc.nodes.root, false, null))
        // let get = self._rpc.nodes.get(target);
        // debug('get =', get);
        self.rpc.destroy(() => {
          debug('destroy callback is called...');
        });
      });
    });

    function visit(res, peer) {
      // debug('visit() is called...');
      // debug('res =', res);
      const peers = res.r.values ? decodePeers(res.r.values) : [];
      for(let i = 0; i < peers.length; i++)
        self.emit('peer', peers[i], infoHash, peer || null);
    }

    function decodePeers(buf: Buffer[]) {
      const peers = [];
      try {
        for(let i = 0; i < buf.length; i++) {
          let port = buf[i].readUInt16BE(4);
          if(!port) continue;
          peers.push({
            host: parseIp(buf[i], 0),
            port: port
          });
        }
      } catch(err) {
        // do nothing
      }
      return peers;
    }

    function parseIp(buf: Buffer, offset: number) {
      return buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++]
    }
  }

  _debug(...args) {
    if (!debug.enabled) return;
    // const args = [].slice.call(arguments);
    args[0] = `[${this.nodeId.toString('hex').substring(0, 7)}] ${args[0]}`;
    for (let i = 1; i < args.length; i++) {
      if (Buffer.isBuffer(args[i])) args[i] = args[i].toString('hex');
    }
    debug(...args);
  }

}