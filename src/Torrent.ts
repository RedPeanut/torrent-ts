// const EventEmitter = require('events');
// const queueMicrotask = require('queue-microtask');
// const parseTorrent = require('parse-torrent');
// const Discovery = require('./Discovery');

import { EventEmitter } from 'events';
import queueMicrotask from 'queue-microtask';
import parseTorrent from 'parse-torrent';
import Discovery from './Discovery';

export default class Torrent extends EventEmitter {

  destroyed = false;
  client;
  discovery;

  constructor(torrentId/* , client, opts */) {
    super();
    // this.client = client;
    this._onTorrentId(torrentId);
  }

  _onTorrentId(torrentId) {
    if(this.destroyed) return;
    let parsedTorrent;
    try { parsedTorrent = parseTorrent(torrentId) } catch (err) {}
    queueMicrotask(() => {
      if(this.destroyed) return;
      this._onParsedTorrent(parsedTorrent);
    });
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
    this.discovery = new Discovery({});
  }
  
}