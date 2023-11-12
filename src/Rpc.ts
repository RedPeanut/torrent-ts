// const Socket = require('./Socket');
// const KBucket = require('./KBucket');
// const { EventEmitter } = require('events');
// const randombytes = require('randombytes');
// // const util = require('util');
// const debug = require('debug')('k-rpc');
// debug.log = console.log.bind(console);
import Socket from './Socket';
import { KBucket } from './KBucket';
import { EventEmitter } from 'events';
import randombytes from 'randombytes';
import { Contact,
  flag_initial,
  flag_queried,
} from './Types';
// const util = require('util');
import _debug from 'debug';
const debug = _debug('k-rpc');
debug.log = console.log.bind(console);

const K = 20;
const MAX_CONCURRENCY = 16;
const BOOTSTRAP_NODES = [
  { host: 'router.bittorrent.com', port: 6881 },
  { host: 'router.utorrent.com', port: 6881 },
  { host: 'dht.transmissionbt.com', port: 6881 }
];

interface Options {
  idLength?: number,
  id?: Buffer,
  nodeId?: Buffer,
  krpcSocket?: typeof Socket,
  nodes?: [],
  bootstrap_nodes?: [],
  concurrency?: number,
  backgroundConcurrency?: number,
  k?: number,
}

/**
 * RPC(Remote Procedure Call)의 목적 또는 목표, 의미 파악하기
 * 
 */
export default class Rpc extends EventEmitter {

  idLength;
  id;
  socket;
  bootstrap_nodes;
  bootstrapped;
  concurrency;
  backgroundConcurrency;
  k;
  destroyed;

  pending;
  nodes;

  // idLength: number;
  // id: Buffer;
  // socket: typeof Socket;
  // bootstrap_nodes: Node[];
  // bootstrapped;
  // concurrency: number;
  // backgroundConcurrency: number;
  // k: number;
  // destroyed: boolean;

  // pending: [] = [];
  // nodes: typeof KBucket;
  // // table: typeof KBucket;

  constructor(opts: Options/* = {
    idLength: 0,
    id: undefined,
    nodeId: null,
    krpcSocket: null,
    nodes: [],
    bootstrap_nodes: [],
    concurrency: 0,
    backgroundConcurrency: 0,
    k: 0,
  } */) {
    super();

    let self = this;

    // if(!opts) opts = {};

    this.idLength = opts.idLength || 20;
    this.id = toBuffer(opts.id || opts.nodeId || randombytes(this.idLength));
    // this.socket = opts.krpcSocket || new Socket(opts);
    this.socket = opts.krpcSocket || new Socket({});
    this.bootstrap_nodes = toBootstrapArray(opts.nodes || opts.bootstrap_nodes);
    this.bootstrapped = false;
    this.concurrency = opts.concurrency || MAX_CONCURRENCY;
    this.backgroundConcurrency = opts.backgroundConcurrency || (this.concurrency / 4) | 0;
    this.k = opts.k || K;
    this.destroyed = false;

    this.pending = [];
    this.nodes = null;

    this.socket.setMaxListeners(0);
    this.socket.on('query', onquery);
    this.socket.on('response', onresponse);
    this.socket.on('warning', onwarning);
    this.socket.on('error', onerror);
    this.socket.on('update', onupdate);
    this.socket.on('listening', onlistening);

    this.clear();

    function onupdate() {
      // debug('onupdate() is called...');
      while(self.pending.length && self.socket.inflight < self.concurrency) {
        var next = self.pending.shift();
        self.query(next[0], next[1], next[2]);
      }
    }

    function onerror(err) {
      // debug('onerror() is called...');
      self.emit('error', err);
    }

    function onlistening() {
      // debug('onlistening() is called...');
      self.emit('listening')
    }

    function onwarning(err) {
      // debug('onwarning() is called...');
      self.emit('warning', err)
    }

    function onquery(query, peer) {
      // debug('onquery() is called...');
      addNode(query.a, peer)
      self.emit('query', query, peer)
    }

    function onresponse(reply, peer) {
      // debug('onresponse() is called...');
      addNode(reply.r, peer)
    }

    function addNode(data, peer) {
      if(data && isNodeId(data.id, self.idLength) && !data.id.equals(self.id)) {
        var old = self.nodes.get(data.id);
        if(old) {
          old.seen = Date.now();
          return;
        }
        self._addNode({
          id: data.id,
          host: peer.address || peer.host,
          port: peer.port,
          distance: 0,
          seen: Date.now()
        });
      }
    }
  }

  response = function(node, query, response, nodes, cb) {
    if(typeof nodes === 'function') {
      cb = nodes
      nodes = null
    }
  
    if(!response.id) response.id = this.id
    if(nodes) response.nodes = encodeNodes(nodes, this.idLength)
    this.socket.response(node, query, response, cb)
  }
  
  error = function(node, query, error, cb) {
    this.socket.error(node, query, error, cb)
  }
  
  // bind([port], [address], [callback])
  bind = function() {
    this.socket.bind.apply(this.socket, arguments)
  }
  
  address = function() {
    return this.socket.address()
  }
  
  query = function(node, message, cb) {
    // debug('this.socket.inflight = ', this.socket.inflight);
    // debug('this.concurrency = ', this.concurrency);
    // debug('this.concurrency = ', this.concurrency);
    if(this.socket.inflight >= this.concurrency) {
      debug('this.socket.inflight >= this.concurrency');
      this.pending.push([node, message, cb]);
    } else {
      debug('else');
      if(!message.a) message.a = {};
      if(!message.a.id) message.a.id = this.id;
      if(node.token) message.a.token = node.token;
      this.socket.query(node, message, cb);
    }
  }
  
  queryAll = function(node, message, visit, cb) {
    
  }

  destroy = function(cb) {
    this.destroyed = true
    this.socket.destroy(cb)
  }
  
  clear = function() {
    let self = this;
  
    /* this.table =  */this.nodes = new KBucket({
      localNodeId: this.id,
      numberOfNodesPerKBucket: this.k,
      numberOfNodesToPing: this.concurrency
    });
  
    this.nodes.on('ping', onping);
  
    function onping(older, newer) {
      self.emit('ping', older, function swap(deadNode) {
        if(!deadNode) return;
        if(deadNode.id) self.nodes.remove(deadNode.id);
        self._addNode(newer);
      })
    }
  }
  
  bootstrap = function(target, message, cb) {

    let self = this;
    let count = 0;
    let pending = 0;
    let bootstraped = false;
    // let queried = {};

    this.bootstrap_nodes.forEach(function(peer) {
      pending++;
      self.socket.query(peer, message, afterQuery);
    });

    function afterQuery(err, res, peer) {
      debug('[bootstrap] afterQuery is called...');
      // debug('err = ', err);
      // debug('res = ', res);
      // debug('peer = ', peer);

      // let self = this;
      pending--;
  
      if(
        peer && peer.id && self.nodes.get(peer.id) &&
        err && (err.code === 'EUNEXPECTEDNODE' || err.code === 'ETIMEDOUT')
      ) {
        // debug('bad..');
        self.nodes.remove(peer.id);
      } else {
        // debug('ok..');
        let r = res && res.r;
        if(!err && isNodeId(r.id, self.idLength)) {
          if(r.id.equals(self.id)) {
            // not add
          } else {
            // debug('good...');
            count++;
            let nodes = r.nodes ? parseNodes(r.nodes, self.idLength) : [];
            for(let i = 0; i < nodes.length; i++)
              add(nodes[i]);
          }
        }
      }
      
      if(!pending) {
        // self.socket.removeListener(evt, kick);
        process.nextTick(done);
      }
    }

    function add(node) {
      if(node.id.equals(self.id)) return;
      self.nodes.add(node);
    }

    function done() {
      if(count <= 0) self.bootstrap(target, message, cb);
      else { cb && cb(null, count) };
    }
  }

  // retry = this.bootstrap;

  getPeers = function(target, message, visit, cb) {
    
    let self = this;
    let pending = 0;
    let count = 0;
    let index = 0;
    let step = 0, cycle = 0;
    let stop = false;
    // let closest;
    let queried = {};

    // ?
    let table = new KBucket({
      localNodeId: target,
      numberOfNodesPerKBucket: this.k,
      numberOfNodesToPing: this.concurrency
    });

    this.socket.on('update', kick); // ?
    kick();

    function kick() {

      if(self.destroyed || self.socket.inflight >= self.concurrency) return;

      let closest = table.closest(target, self.k);
      if (!closest.length)
        closest = self.nodes.closest(target, self.k)
      
      // debug('closest.length =', closest.length);

      for(let i = 0; i < closest.length; i++) {
        if(stop) break;
        if(self.socket.inflight >= self.concurrency) return;

        let contact = closest[i];
        let id = contact.host + ':' + contact.port;
        if(queried[id]) continue;
        queried[id] = true;

        pending++;
        self.socket.query(contact, message, afterQuery);
      }

      if(!pending) { // if (pending == 0) {
        self.socket.removeListener('update', kick);
        process.nextTick(done);
      }
    }

    function done() {
      cb(null, count);
    }

    function afterQuery(err, res, peer) {

      pending--;

      if(
        peer && peer.id && self.nodes.get(peer.id) &&
        err && (err.code === 'EUNEXPECTEDNODE' || err.code === 'ETIMEDOUT')
      ) {
        // debug('bad...');
        self.nodes.remove(peer.id);
      }
    
      let r = res && res.r;
      if(!r) {
        // debug('!r...');
        return kick();
      }

      if(!err && isNodeId(r.id, self.idLength)) {
        // debug('good...');
        count++;

        add({
          id: r.id,
          port: peer.port,
          host: peer.host || peer.address,
          distance: 0,
          flags: 0
        });


      } else {
        debug('error...');
        debug('err =', err, ', res =', res, ', peer =', peer);
        // self.nodes.remove(peer.id);
      }
      
      let nodes = r.nodes ? parseNodes(r.nodes, self.idLength) : [];
      for(let i = 0; i < nodes.length; i++)
        add(nodes[i]);

      visit && visit(res, peer);
      kick();
    }

    function add(node) {
      if(node.id.equals(self.id)) return;
      table.add(node);
    }
  }

  _addNode = function(node) {
    var old = this.nodes.get(node.id);
    this.nodes.add(node);
    if(!old) this.emit('node', node);
  }
  
}

function toBootstrapArray(val): { host: string, port: number }[] {
  if(val === false) return [];
  if(val === true) return BOOTSTRAP_NODES;
  return [].concat(val || BOOTSTRAP_NODES).map(parsePeer);
}

function isNodeId(id, idLength) {
  return id && Buffer.isBuffer(id) && id.length === idLength;
}

function encodeNodes(nodes, idLength) {
  var buf = Buffer.allocUnsafe(nodes.length * (idLength + 6));
  var ptr = 0;

  for(var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if(!isNodeId(node.id, idLength)) continue;
    node.id.copy(buf, ptr);
    ptr += idLength;
    var ip = (node.host || node.address).split('.');
    for(var j = 0; j < 4; j++) 
      buf[ptr++] = parseInt(ip[j] || 0, 10);
    buf.writeUInt16BE(node.port, ptr);
    ptr += 2;
  }

  if(ptr === buf.length) return buf;
  return buf.slice(0, ptr);
}

function parseNodes(buf, idLength) {
  let contacts = [];
  try {
    for(var i = 0; i < buf.length; i += (idLength + 6)) {
      var port = buf.readUInt16BE(i + (idLength + 4));
      if(!port) continue;
      contacts.push({
        id: buf.slice(i, i + idLength),
        host: parseIp(buf, i + idLength),
        port: port,
        distance: 0, // ?
        token: null
      });
    }
  } catch(err) {
    // do nothing
  }

  return contacts;
}

function parseIp(buf, offset) {
  return buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++];
}

function parsePeer(peer) {
  if(typeof peer === 'string')
    return { host: peer.split(':')[0], port: Number(peer.split(':')[1]) };
  return peer;
}

function noop() {}

function toBuffer(str) {
  if(Buffer.isBuffer(str)) return str;
  if(ArrayBuffer.isView(str)) return Buffer.from(str.buffer, str.byteOffset, str.byteLength);
  if(typeof str === 'string') return Buffer.from(str, 'hex');
  throw new Error('Pass a buffer or a string');
}

