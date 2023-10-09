const EventEmitter = require('events');
const queueMicrotask = require('queue-microtask');

export default class Torrent extends EventEmitter {

  destroyed = false;
  client;

  constructor(torrentId, client, opts) {
    super();
    this.client = client;
    this._onTorrentId('');
  }

  _onTorrentId(torrentId) {
    if(this.destroyed) return;
    let parsedTorrent;
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
    
  }
}