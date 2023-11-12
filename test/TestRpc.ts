const magnet = require('magnet-uri');
const Rpc = require('../src/Rpc');
// const krpc = require('k-rpc');

class TestRpc {
  run(args: []): void {
    
    const captain = 'magnet:?xt=urn:btih:2ae7f9a05790e713f7c753af931e32d138ce2a61'; // 캡틴아메리카 윈터솔져
    const parsed = magnet(captain);
    const target = Buffer.from(parsed.infoHash, 'hex');
    
    let _rpc = new Rpc.default({});
    _rpc.on('query', function(query, peer) {
      // console.log(query, peer);
      // console.trace();
      if(query.q === undefined || query.q === null) return;
      const q = query.q.toString();
      console.log('received %s query from %s:%d', q, peer.address, peer.port);
    });

    /* _rpc.on('response', function(message, rinfo) {
      if(message) {
        if(message.ip) console.log('message.ip =', message.ip.toString());
        if(message.t) console.log('message.t =', message.t.toString());
        if(message.y) console.log('message.y =', message.y.toString());
      }
      console.log('rinfo =', rinfo);
    }); */

    let then = Date.now();

    // TODO: get_peers with bootstrap node
    _rpc.bootstrap(_rpc.id, { q: 'get_peers', a: { id: _rpc.id, info_hash: target } }, function(err, numberOfReplies) {
    // _rpc.bootstrap(_rpc.id, { q: 'find_node', a: { id: _rpc.id, target: target } }, function(err, numberOfReplies) {
      console.log('(bootstrapped)', Date.now() - then, 'ms, numberOfReplies =', numberOfReplies);
      then = Date.now();
      // get_peers
      _rpc.getPeers(target, { q: 'get_peers', a: { id: _rpc.id, info_hash: target } }, visit, function(err, numberOfReplies) {
        // console.trace();
        console.log('(get_peers)', Date.now() - then, 'ms, numberOfReplies =', numberOfReplies);
        // console.log(require('util').inspect(_rpc.nodes.root, false, null))
        let get = _rpc.nodes.get(target);
        console.log('get =', get);
        _rpc.destroy(() => {
          console.log('destroy callback is called...');
        });
      });
    });

    function visit(res, peer) {
      let peers = res.r.values ? parsePeers(res.r.values) : [];
      if(peers.length)
        console.log('count peers:', peers.length);
    }

    function parsePeers(buf) {
      let peers = []; //: {host:string,port:number}[] = [];
      try {
        for(let i = 0; i < buf.length; i++) {
          let port = buf[i].readUInt16BE(4);
          if(!port) continue;
          peers.push({
            host: parseIp(buf[i], 0),
            port: port
          });
        }
      } catch(err) {
        console.log('err =', err);
        // do nothing
      }

      return peers;
    }

    function parseIp(buf, offset) {
      return buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++]
    }
  }
}

new TestRpc().run([]);