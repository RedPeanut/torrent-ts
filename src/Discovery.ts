import {EventEmitter} from 'events';
import DHT from './DHT';

interface Options {
  
}

export default class Discovery extends EventEmitter {

  dht;

  constructor(opts) {
    super();
    if(this.dht)
      this._announce();
  }

  _announce() {
    this.dht.announce();
  }

}
