export default class Client {

  destroyed = false;

  add(torrentId, opts = {}, ontorrent = () => {}) {
    if (this.destroyed) throw new Error('client is destroyed');
    
  }

}