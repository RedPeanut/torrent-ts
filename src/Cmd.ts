import Yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import chalk from 'chalk'
import stripIndent from 'common-tags/lib/stripIndent/index.js'
import WebTorrent from './WebTorrent'
import Torrent from './Torrent';

const options = {
  advanced: {
    q: { alias: 'quiet', desc: 'Don\'t show UI on stdout', type: 'boolean' },
  }
}

const commands = [
  { command: ['download [torrent-ids...]', '$0'], desc: 'Download a torrent', handler: (args) => { processInputs(args.torrentIds, runDownload) } },
  { command: 'downloadmeta <torrent-ids...>', desc: 'Download metadata of torrent', handler: (args) => { processInputs(args.torrentIds, runDownloadMeta) } },
  { command: 'help', desc: 'Show help information', handler: null }
];

let client, server, webTorrent, argv;
let gracefullyExiting = false;
const yargs = Yargs();

function exec() {
  process.title = 'torrent-ts';
  process.on('exit', code => {
    console.log('exit event is called...');
    if(code === 0) return; // normal exit
    if(code === 130) return; // intentional exit with Control-C
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

function gracefulExit() {
  if(gracefullyExiting)
    return;
  
  gracefullyExiting = true;

  console.log(chalk`\n{green webtorrent is exiting...}`);

  process.removeListener('SIGINT', gracefulExit);
  process.removeListener('SIGTERM', gracefulExit);

  if(!webTorrent)
    return;
  
  webTorrent.destroy(err => {
    if(err) {
      return fatalError(err);
    }
  });
}

function fatalError(err) {
  console.log(chalk`{red Error:} ${err.message || err}`);
  process.exit(1);
}

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
  webTorrent = new WebTorrent({});
  let torrent = webTorrent.add(torrentId);
  torrent.on('infoHash', () => {});
  torrent.on('metadata', () => {});
  torrent.on('done', () => {});
  webTorrent.startDiscovery(torrent);
}

function runDownloadMeta(torrentId) {
  // console.log('argv.out =', argv.out, ', argv.quiet =', argv.quiet);
  webTorrent = new WebTorrent({});
  const torrent = webTorrent.add(torrentId);
  torrent.on('infoHash', function() {
    const torrentFilePath = `${argv.out}/${this.infoHash}.torrent`;

    if(argv.quiet)
      return;
    
    updateMetadata();
    torrent.on('wire', updateMetadata);

    function updateMetadata() {
      console.clear();
      console.log(chalk`{green fetching torrent metadata from} {bold ${torrent.numPeers}} {green peers}`);
    }

    torrent.on('metadata', function () {
      console.clear();
      torrent.removeListener('wire', updateMetadata);

      console.clear();
      console.log(chalk`{green saving the .torrent file data to ${torrentFilePath} ...}`);
      fs.writeFileSync(torrentFilePath, this.torrentFile);
      gracefulExit();
    })
  });
}

exec();