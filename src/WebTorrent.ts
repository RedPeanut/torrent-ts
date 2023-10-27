import DHT from './DHT';
import Torrent from './Torrent';

export default class WebTorrent {

  dht;
  torrents;

  constructor() {
    this.dht = new DHT();
  }

  add(torrentId, opts = {}, ontorrent = () => {}) {
    const torrent = new Torrent(torrentId, this);
    this.torrents.push(torrent);
    return torrent;
  }
}