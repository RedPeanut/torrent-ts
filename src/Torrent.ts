// const EventEmitter = require('events');
// const queueMicrotask = require('queue-microtask');
// const parseTorrent = require('parse-torrent');
// const Discovery = require('./Discovery');
import { EventEmitter } from 'events';
import queueMicrotask from 'queue-microtask';
import parseTorrent from 'parse-torrent';
import Discovery from './Discovery';
import Client from './Client';
// import { Peer } from './Types';
import net from 'net'; // browser exclude?
import addrToIPPort from 'addr-to-ip-port';
import Peer from './Peer';

const debug = require('debug')('torrent');

export default class Torrent extends EventEmitter {

  destroyed: boolean = false;
  client: Client;
  discovery;
  infoHash;
  // debugId;

  _queue = [];
  _peers = {};

  // stats

  // for cleanup

  constructor(torrentId, client: Client/*, opts */) {
    super();
    this.client = client;
    this._onTorrentId(torrentId);
  }

  _onTorrentId(torrentId) {
    if(this.destroyed) return;
    let parsedTorrent;
    try { parsedTorrent = parseTorrent(torrentId) } catch (err) {}
    if(parsedTorrent) {
      this.infoHash = parsedTorrent.infoHash
      this._debugId = parsedTorrent.infoHash.toString('hex').substring(0, 7)
      queueMicrotask(() => {
        if(this.destroyed) return;
        this._onParsedTorrent(parsedTorrent);
      });
    }
  }

  _onParsedTorrent(parsedTorrent) {
    if(this.destroyed) return;
    this._onListening();
  }

  _onListening() {
    if(this.destroyed) return;
    this.startDiscovery();
  }

  _startDiscovery() {
    // this.discovery = new Discovery({});
  }
  
  startDiscovery() {
    let self = this;
    this.client.dht.lookup(this.infoHash, null);
    this.client.dht.on('peer', (peer, source) => {
      debug('peer %s discovered via %s', peer, source);
      self.addPeer(peer);
    });
  }

  addPeer(peer) {
    const wasAdded = !!this._addPeer(peer);
    // this._drain();
  }

  _addPeer(peer): Peer {
    const id = peer.host + ':' + peer.port;
    let newPeer: Peer = Peer.createTCPOutgoingPeer(id, this /* swarm */);
    // _registerPeer(newPeer);
    this._queue.push(newPeer);
    this._drain();
    return newPeer;
  }

  /**
   * 
   */
  _drain() {
    const peer = this._queue.shift();
    const parts = addrToIPPort(peer.addr);
    const opts/* : net.NetConnectOpts */ = {
      host: parts[0],
      port: parts[1]
    };
    peer.conn = net.connect(opts);
    const conn = peer.conn;
    conn.once('connect', () => { if(!this.destroyed) peer.onConnect(); });
    conn.once('error', err => { peer.destroy(err); });
    peer.startConnectTimeout();

    // 
    conn.on('close', () => {});
  }

  destroy(cb: Function) {
    if(this.destroyed) return;
    this.destroyed = true;
    this._debug('destroy');
    this.emit('close');

    this.client = null;
    this.discovery = null;
    this._peers = null;
  }

  _debugId: string;
  _debug(...args) {
    // const args = [].slice.call(arguments);
    args[0] = `[${this.client ? this.client._debugId : 'No Client'}] [${this._debugId}] ${args[0]}`;
    debug(...args);
  }
}