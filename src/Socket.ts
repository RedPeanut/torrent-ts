// const { EventEmitter } = require('events');
// const dgram = require('dgram');
// const bencode = require('bencode');
// const isIP = require('net').isIP;
// const dns = require('dns');
// const util = require('util');
// const events = require('events');
import { EventEmitter } from 'events';
import * as dgram from 'dgram';
import * as bencode from 'bencode';
import { isIP } from 'net';
import * as dns from 'dns';
import * as util from 'util';
import * as events from 'events';
// const debug = require('debug')('k-rpc-socket');
import _debug from 'debug';
const debug = _debug('k-rpc-socket');
debug.log = console.log.bind(console);

class MyError extends Error {
  code: string | number;
}

const ETIMEDOUT = new MyError('Query timed out');
ETIMEDOUT.code = 'ETIMEDOUT';

const EUNEXPECTEDNODE = new MyError('Unexpected node id');
EUNEXPECTEDNODE.code = 'EUNEXPECTEDNODE';

interface Options {
  timeout?: number;
  isIP?: Function;
  socket?: typeof dgram.Socket;
}

export class Socket extends EventEmitter {

  timeout: number;
  inflight: number;
  destroyed: boolean;
  // isIP: boolean;
  isIP: Function;
  // socket: typeof Socket;
  socket: any;

  _tick: number;
  // _ids: typeof Array<number> = new Array<number>();
  // _reqs: [{
  //   ttl: number,
  //   peer: {
  //     host: string,
  //     port: number,
  //     id: Buffer
  //   },
  //   callback: Function,
  //   message: string
  // }] = [];
  // _ids: [any];
  // _reqs: [any];
  // _ids: [];
  // _reqs: [];
  _ids;
  _reqs;
  _timer: NodeJS.Timer;

  constructor(opts: Options) {
    super();

    // if(!opts) opts = {};
  
    var self = this;
  
    this.timeout = opts.timeout || 2000;
    this.inflight = 0;
    this.destroyed = false;
    this.isIP = opts.isIP || isIP;
    this.socket = opts.socket || dgram.createSocket('udp4');
    this.socket.on('message', onmessage);
    this.socket.on('error', onerror);
    this.socket.on('listening', onlistening);
  
    this._tick = 0;
    this._ids = [];
    this._reqs = [];
    this._timer = setInterval(check, Math.floor(this.timeout / 4));
  
    function check() {
      var missing = self.inflight;
      if(!missing) return;
      for(var i = 0; i < self._reqs.length; i++) {
        var req = self._reqs[i];
        if(!req) continue;
        if(req.ttl) req.ttl--;
        else self._cancel(i, ETIMEDOUT);
        if(!--missing) return;
      }
    }
  
    function onlistening() {
      self.emit('listening');
    }
  
    function onerror(err) {
      if(err.code === 'EACCES' || err.code === 'EADDRINUSE') self.emit('error', err);
      else self.emit('warning', err);
    }
  
    function onmessage(buf, rinfo) {
      debug('onmessage is called...');
      if(self.destroyed) return;
      if(!rinfo.port) return; // seems like a node bug that this is nessesary?
  
      // debug('>>> 1')
      let message;
      try {
        message = bencode.decode(buf);
      } catch(e) {
        return self.emit('warning', e);
      }
  
      // debug('message =', message)
      // debug('rinfo =', rinfo)
      // if(message) {
      //   // if(message.ip) debug('message.ip =', message.ip.toString());
      //   // if(message.t) debug('message.t =', message.t.toString());
      //   if(message.y) debug('message.y =', message.y.toString());
      // }
  
      // debug('>>> 2')
      let type = message && message.y && message.y.toString();
      // debug('type =', type);
      if(type === 'r' || type === 'e') {
        // debug('>>> 2-1');
        if(!Buffer.isBuffer(message.t)) return;
  
        let tid : number;
        try {
          tid = message.t.readUInt16BE(0);
        } catch(err) {
          return self.emit('warning', err);
        }
  
        let index = self._ids.indexOf(tid);
        if(index === -1 || tid === 0) {
          self.emit('response', message, rinfo);
          self.emit('warning', new Error('Unexpected transaction id: ' + tid));
          return
        }
  
        let req = self._reqs[index];
        if(req.peer.host !== rinfo.address) {
          self.emit('response', message, rinfo);
          self.emit('warning', new Error('Out of order response'));
          return;
        }
  
        self._ids[index] = 0;
        self._reqs[index] = null;
        self.inflight--;
  
        if(type === 'e') {
          let isArray = Array.isArray(message.e);
          let err = new MyError(isArray ? message.e.join(' ') : 'Unknown error');
          err.code = isArray && message.e.length && typeof message.e[0] === 'number' ? message.e[0] : 0;
          req.callback(err, message, rinfo, req.message);
          self.emit('update');
          self.emit('postupdate');
          return;
        }
  
        let rid = message.r && message.r.id;
        if(req.peer && req.peer.id && rid && !req.peer.id.equals(rid)) {
          req.callback(EUNEXPECTEDNODE, null, rinfo);
          self.emit('update');
          self.emit('postupdate');
          return;
        }
  
        req.callback(null, message, rinfo, req.message);
        self.emit('update');
        self.emit('postupdate');
        self.emit('response', message, rinfo);
      } else if(type === 'q') {
        // debug('>>> 2-2');
        self.emit('query', message, rinfo);
      } else {
        // debug('>>> 2-3');
        self.emit('warning', new Error('Unknown type: ' + type));
      }
    }
  }

  address = function() {
    return this.socket.address();
  }
  
  response = function(peer, req, res, cb) {
    this.send(peer, { t: req.t, y: 'r', r: res }, cb);
  }
  
  error = function(peer, req, error, cb) {
    this.send(peer, { t: req.t, y: 'e', e: [].concat(error.message || error) }, cb);
  }
  
  send = function(peer, message, cb) {
    let buf = bencode.encode(message);
    this.socket.send(buf, 0, buf.length, peer.port, peer.address || peer.host, cb || this.noop);
  }
  
  // bind([port], [address], [callback])
  bind = function() {
    this.socket.bind.apply(this.socket, arguments);
  }
  
  destroy = function(cb) {
    this.destroyed = true;
    clearInterval(this._timer);
    if(cb) this.socket.on('close', cb);
    for(var i = 0; i < this._ids.length; i++) this._cancel(i);
    this.socket.close();
  }
  
  query = function(peer, query, cb) {
    if(!cb) cb = this.noop;
    if(!this.isIP(peer.host))
      return this._resolveAndQuery(peer, query, cb);
  
    var message = {
      t: Buffer.allocUnsafe(2),
      y: 'q',
      q: query.q,
      a: query.a
    }
  
    var req = {
      ttl: 4, // 2초/4=0.5초
      peer: peer,
      message: message,
      callback: cb
    }
  
    if(this._tick === 65535) this._tick = 0;
    var tid = ++this._tick;
  
    var free = this._ids.indexOf(0);
    if(free === -1) free = this._ids.push(0) - 1;
    this._ids[free] = tid;
    while(this._reqs.length < free) this._reqs.push(null);
    this._reqs[free] = req;
  
    this.inflight++;
    message.t.writeUInt16BE(tid, 0);
    this.send(peer, message);
    return tid;
  }
  
  cancel = function(tid, err) {
    var index = this._ids.indexOf(tid);
    if(index > -1) this._cancel(index, err);
  }
  
  _cancel = function(index, err) {
    var req = this._reqs[index];
    this._ids[index] = 0;
    this._reqs[index] = null;
    if(req) {
      this.inflight--;
      req.callback(err || new Error('Query was cancelled'), null, req.peer);
      this.emit('update');
      this.emit('postupdate');
    }
  }
  
  _resolveAndQuery = function(peer, query, cb) {
    var self = this;
    // debug('_resolveAndQuery is called, peer =', peer);
    dns.lookup(peer.host, function(err, ip) {
      if(err) return cb(err);
      if(self.destroyed) return cb(new Error('k-rpc-socket is destroyed'));
      self.query({ host: ip, port: peer.port }, query, cb);
    })
  }
  
  noop = function() {}
}

// module.exports = Socket;
