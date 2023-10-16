import Yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
// import fs from 'fs'
// import chalk from 'chalk'
import stripIndent from 'common-tags/lib/stripIndent/index.js'
import WebTorrent from './WebTorrent'

// export default class Cmd {

//   commands = [
//     { command: ['download [torrent-ids...]', '$0'], desc: 'Download a torrent', handler: (args) => { this.processInputs(args.torrentIds, this.runDownload) } },
//     { command: 'help', desc: 'Show help information', handler: null }
//   ];
//   argv = null;
//   yargs = Yargs();

//   exec() {
//     process.title = 'torrent-ts';
//     process.on('exit', code => {
//       console.log('exit event is called...');
//     });
//     process.on('SIGINT', this.gracefulExit);
//     process.on('SIGTERM', this.gracefulExit);

//     this.yargs.usage(stripIndent`
//       Usage:
//         webtorrent [command] <torrent-id> [options]`
//     );
//     this.yargs.command(this.commands);
//     this.yargs.middleware(this.init)
//     this.yargs
//       .strict()
//       .help('help', 'Show help information')
//       .alias({ help: 'h', version: 'v' })
//       .parse(hideBin(process.argv), { startTime: Date.now() })
//   }

//   gracefulExit() {}

//   init(_argv) {
//     console.log('init() is called...');
//     this.argv = _argv;
//   }

//   processInputs(inputs, fn) {
//     console.log('processInputs() is called...');
//     if(Array.isArray(inputs) && inputs.length !== 0) {
//       inputs.forEach(input => fn(input));
//     } else {
//       this.yargs.showHelp('log');
//     }
//   }

//   runDownload(torrentId) {
//     console.log('runDownload() is called...');
//     let webTorrent = new WebTorrent();
//   }

// }

// new Cmd().exec();

const commands = [
  { command: ['download [torrent-ids...]', '$0'], desc: 'Download a torrent', handler: (args) => { processInputs(args.torrentIds, runDownload) } },
  { command: 'help', desc: 'Show help information', handler: null }
];
let argv;
const yargs = Yargs();

function exec() {
  process.title = 'torrent-ts';
  process.on('exit', code => {
    console.log('exit event is called...');
  });
  process.on('SIGINT', gracefulExit);
  process.on('SIGTERM', gracefulExit);

  yargs
    .scriptName('torrent-ts')
    .usage(
      stripIndent`
        Usage:
          torrent-ts [command] <torrent-id> [options]
      `);
  yargs.command(commands);
  yargs.middleware(init)
  yargs
    .strict()
    .help('help', 'Show help information')
    .alias({ help: 'h', version: 'v' })
    .parse(hideBin(process.argv), { startTime: Date.now() })
}

function gracefulExit() {}

function init(_argv) {
  console.log('init() is called...');
  argv = _argv;
}

function processInputs(inputs, fn) {
  console.log('processInputs() is called...');
  if(Array.isArray(inputs) && inputs.length !== 0) {
    inputs.forEach(input => fn(input));
  } else {
    yargs.showHelp('log');
  }
}

function runDownload(torrentId) {
  console.log('runDownload() is called...');
  let webTorrent = new WebTorrent();
  let torrent = webTorrent.add(torrentId);
  torrent.on('infoHash', () => {});
  torrent.on('metadata', () => {});
  torrent.on('done', () => {});
}

exec();