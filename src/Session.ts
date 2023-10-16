import { EventEmitter } from "events";

interface Options {
  timeout;
}

class Session extends EventEmitter {

  timeout;

  timer;
  destroyed;

  constructor(opts) {
    super();
    this.timeout = opts.timeout || 2000;
    this.timer = setInterval(this.onTick, Math.floor(this.timeout / 4))
  }

  onTick() {

  }

  destroy(cb: Function) {
    this.destroyed = true;
    clearInterval(this.timer);
  }

}
module.exports = Session;