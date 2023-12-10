import DHT from './DHT';
import Torrent from './Torrent';
import parallel from 'run-parallel';
import randombytes from 'randombytes';

const debug = require('debug')('client');
// 빌드후 경로 차이로 인해 프로세스 환경변수 참조로 변경 - 231210
// const { version: VERSION } = require('package.json');
const VERSION = process.env.npm_package_version;

/**
 * Version number in Azureus-style. Generated from major and minor semver version.
 * For example:
 *   '0.16.1' -> '0016'
 *   '1.2.5' -> '0102'
 */
const VERSION_STR = VERSION
  .replace(/\d*./g, v => `0${parseInt(v) % 100}`.slice(-2))
  .slice(0, 4)

/**
 * Version prefix string (used in peer ID). uses the Azureus-style
 * encoding: '-', two characters for client id ('TT'), four ascii digits for version
 * number, '-', followed by random numbers.
 * For example:
 *   '-TT0102-'...
 */
const VERSION_PREFIX = `-TT${VERSION_STR}-`

interface Options {
  dht?: DHT;
  path?: string;
}

export default class Client {

  destroyed: boolean = false;
  dht: DHT;
  torrents: Torrent[] = [];

  peerId: string;
  _debugId: string;

  constructor(opts: Options) {
    this._debugId = this.peerId = Buffer.from(VERSION_PREFIX + randombytes(9).toString('base64')).toString();
    this.dht = new DHT({});
  }

  add(torrentId, opts = {}, ontorrent = () => {}) {
    if(this.destroyed) throw new Error('client is destroyed')
    const torrent = new Torrent(torrentId, this /* client */);
    this.torrents.push(torrent);
    return torrent;
  }

  destroy(cb: Function) {
    if(this.destroyed) throw new Error('client already destroyed');

    this._debug('client destroy');
    this.destroyed = true;

    const tasks = this.torrents.map(torrent => cb => {
      torrent.destroy(cb);
    });

    if(this.dht) {
      tasks.push(cb => {
        this.dht.destroy(cb);
      })
    }

    parallel(tasks, cb);

    this.torrents = [];
    this.dht = null;
  }

  _debug(...args) {
    // const args = [].slice.call(arguments);
    args[0] = `[${this._debugId}] ${args[0]}`;
    debug(...args);
  }
}