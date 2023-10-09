// const { EventEmitter } = require('events');
import {EventEmitter} from 'events';
import Rpc from './Rpc';

class DHT extends EventEmitter {

  _rpc: typeof Rpc;

  constructor(opts={}) {
    super();
    this._rpc = new Rpc.default();
    
  }

}
module.exports = DHT;