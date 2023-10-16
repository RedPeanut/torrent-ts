import {EventEmitter} from 'events';
import DHT from './DHT';

interface Options {
  
}

export default class Discovery extends EventEmitter {

  dht;

  constructor(opts) {
    super();
    this.dht = this.createDHT();
    if(this.dht)
      this._dhtAnnounce();
  }

  createDHT() {
    const dht = new DHT();
    return dht;
  }

  _dhtAnnounce() {
    this.dht.announce();
  }

}
// module.exports = Discovery;