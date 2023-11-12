// const EventEmitter = require('events');
// const queueMicrotask = require('queue-microtask');
// const parseTorrent = require('parse-torrent');
// const Discovery = require('./Discovery');
import { EventEmitter } from 'events';
import queueMicrotask from 'queue-microtask';
import parseTorrent from 'parse-torrent';
import Discovery from './Discovery';
import WebTorrent from './WebTorrent';
// import { Peer } from './Types';
import net from 'net'; // browser exclude
import addrToIPPort from 'addr-to-ip-port';

const debug = require('debug')('torrent');

export default class Torrent extends EventEmitter {

  destroyed: boolean = false;
  client: WebTorrent;
  discovery;
  infoHash;
  debugId;

  _queue = [];
  _peers = {};

  // stats

  // for cleanup

  constructor(torrentId, client: WebTorrent/*, opts */) {
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
      this.debugId = parsedTorrent.infoHash.toString('hex').substring(0, 7)
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
    this._startDiscovery();
  }

  _startDiscovery() {
    // this.discovery = new Discovery({});
  }
  
  startDiscovery() {
    this.client.dht.lookup(this.infoHash, null);
    this.client.dht.on('peer', (peer, source) => {
      debug('peer %s discovered via %s', peer, source);
      // this.addPeer(peer);
    });
  }

  addPeer(peer) {
    this._addPeer(peer);
    // this._drain(peer);
  }

  _addPeer(peer) {
    let newPeer;
    this._drain();
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
    conn.once('connect', () => { if(!this.destroyed) peer.onConnect(); })
    conn.once('error', err => { peer.destroy(err); })

  }

  _debugId: string;
  _debug () {
    const args = [].slice.call(arguments);
    args[0] = `[${this.client ? this.client._debugId : 'No Client'}] [${this._debugId}] ${args[0]}`;
    debug(...args);
  }
}