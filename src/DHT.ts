// const { EventEmitter } = require('events');
import {EventEmitter} from 'events';
import Rpc from './Rpc';

export default class DHT extends EventEmitter {

  // _rpc: typeof Rpc;
  _rpc;

  constructor(opts={}) {
    super();
    this._rpc = new Rpc({});
    
  }

}

// module.exports = DHT;