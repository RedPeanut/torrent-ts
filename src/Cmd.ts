import Yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import chalk from 'chalk'
import stripIndent from 'common-tags/lib/stripIndent/index.js'
import Client from './Client'
import Torrent from './Torrent';
const debug = require('debug')('cmd');

export default class Cmd {
  
  server;
  client: Client;
  argv;
  gracefullyExiting = false;

  yargs = Yargs();
  
  constructor() {}

  exec() {
    process.title = 'torrent-ts';
    process.on('exit', code => {
      debug('exit event is called...');
      if(code === 0) return; // normal exit
      if(code === 130) return; // intentional exit with Control-C
    });
    process.on('SIGINT', this.gracefulExit.bind(this));
    process.on('SIGTERM', this.gracefulExit.bind(this));
  
    const options = {
      advanced: {
        q: { alias: 'quiet', desc: 'Don\'t show UI on stdout', type: 'boolean' },
      }
    }
    
    const commands = [
      { command: ['download [torrent-ids...]', '$0'], desc: 'Download a torrent', handler: (args) => { this.processInputs(args.torrentIds, this.runDownload.bind(this)) } },
      { command: 'downloadmeta <torrent-ids...>', desc: 'Download metadata of torrent', handler: (args) => { this.processInputs(args.torrentIds, this.runDownloadMeta.bind(this)) } },
      { command: 'help', desc: 'Show help information', handler: null }
    ];

    this.yargs
      .scriptName('torrent-ts')
      .usage(
        stripIndent`
          Usage:
            torrent-ts [command] <torrent-id> [options]
        `);
    this.yargs.command(commands);
    this.yargs.middleware(this.init.bind(this))
    this.yargs
      .strict()
      .help('help', 'Show help information')
      .alias({ help: 'h', version: 'v' })
      .parse(hideBin(process.argv), { startTime: Date.now() })
  }
  
  /**
   * must be called with binding for this
   * @returns 
   */
  gracefulExit() {
    if(this.gracefullyExiting)
      return;
    
      this.gracefullyExiting = true;
  
    console.log(chalk`\n{green webtorrent is exiting...}`);
  
    process.removeListener('SIGINT', this.gracefulExit);
    process.removeListener('SIGTERM', this.gracefulExit);
  
    if(!this.client)
      return;
    
    this.client.destroy(err => {
      if(err) {
        return this.fatalError(err);
      }
    });
  }
  
  fatalError(err) {
    console.log(chalk`{red Error:} ${err.message || err}`);
    process.exit(1);
  }
  
  /**
   * must be called with binding for this
   * @param _argv 
   */
  init(_argv: object) {
    debug('init() is called...');
    debug(_argv);
    // console.log(typeof(_argv));
    this.argv = _argv;
  }
  
  processInputs(inputs, fn) {
    debug('processInputs() is called...');
    if(Array.isArray(inputs) && inputs.length !== 0) {
      inputs.forEach(input => fn(input));
    } else {
      this.yargs.showHelp('log');
    }
  }
  
  /**
   * must be called with binding for this
   * @param torrentId 
   */
  runDownload(torrentId) {
    // console.log('runDownload() is called...');
    if(!this.argv.out && !this.argv.stdout)
      this.argv.out = process.cwd();

    this.client = new Client({
      path: this.argv.out
    });
    const torrent = this.client.add(torrentId);
    torrent.on('infoHash', () => {});
    // torrent.on('metadata', () => {});
    torrent.on('done', () => {});
    // torrent.startDiscovery();
  }
  
  /**
   * must be called with binding for this
   * @param torrentId 
   */
  runDownloadMeta(torrentId) {
    // console.log('argv.out =', argv.out, ', argv.quiet =', argv.quiet);
    if(!this.argv.out && !this.argv.stdout)
      this.argv.out = process.cwd();

    let self = this;
    this.client = new Client({});
    const torrent = this.client.add(torrentId);

    // torrent.on('stop', this.gracefulExit.bind(this));

    torrent.on('infoHash', function() {
      const torrentFilePath = `${self.argv.out}/${this.infoHash}.torrent`;
  
      // if(this.argv.quiet)
      //   return;
      
      updateMetadata();
      torrent.on('wire', updateMetadata);
  
      function updateMetadata() {
        // console.clear();
        console.log(chalk`{green fetching torrent metadata from} {bold ${torrent.numPeers}} {green peers}`);
      }
  
      torrent.on('metadata', function() {
        // console.clear();
        torrent.removeListener('wire', updateMetadata);
  
        // console.clear();
        console.log(chalk`{green saving the .torrent file data to ${torrentFilePath} ...}`);
        fs.writeFileSync(torrentFilePath, this.torrentFile);
        self.gracefulExit();
      })
    });
  }

  /**
   * 
   * @returns 
   */
  getRuntime(): number {
    return Math.floor((Date.now() - this.argv.startTime) / 1000);
  }

}
