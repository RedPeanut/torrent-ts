import Yargs from 'yargs'
// import fs from 'fs'
// import chalk from 'chalk'

export default class Cmd {

  commands = [
    { command: ['download [torrent-ids...]', '$0'], desc: 'Download a torrent', handler: (args) => { this.processInputs(args.torrentIds, this.runDownload) } },
  ];
  argv;

  exec(args: []) {
    const yargs = Yargs({});
    process.title = 'torrent-ts';
    process.on('exit', code => {
    });
    process.on('SIGINT', this.gracefulExit);
    process.on('SIGTERM', this.gracefulExit);
    yargs.middleware(this.init)
  }

  gracefulExit() {}

  init(_argv) {
    this.argv = _argv;
  }

  processInputs(inputs, fn) {
    inputs.forEach(input => fn(input));
  }

  runDownload(torrentId) {}

}