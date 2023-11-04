import DHT from './DHT';
import Torrent from './Torrent';
const debug = require('debug')('webtorrent');

interface Options {
  dht?: DHT;
}

export default class WebTorrent {

  destroyed: boolean = false;
  dht: DHT;
  torrents: Torrent[] = [];

  constructor(opts: Options) {
    this.dht = new DHT({});

  }

  add(torrentId, opts = {}, ontorrent = () => {}) {
    if(this.destroyed) throw new Error('client is destroyed')
    const torrent = new Torrent(torrentId, this /* client */);
    this.torrents.push(torrent);
    return torrent;
  }

  startDiscovery(torrent: Torrent) {
    this.dht.lookup(torrent.infoHash, null);
    this.dht.on('peer', (peer, source) => {
      debug('peer %s discovered via %s', peer, source);
      // this.addPeer(peer);
    });
  }

  addPeer(peer) {}

}