import krpc from 'k-rpc';
import magnet from 'magnet-uri';

class TestKRpc {

  main(args: string[]): void {

    const captain = 'magnet:?xt=urn:btih:2ae7f9a05790e713f7c753af931e32d138ce2a61'; // 캡틴아메리카 윈터솔져
    const parsed = magnet(captain);
    let target = Buffer.from(parsed.infoHash, 'hex');
    
    let rpc = krpc();
    rpc.on('query', function (query, peer) {
      // console.log(query, peer)
      if (query.q === undefined || query.q === null) return
      const q = query.q.toString()
      console.log('received %s query from %s:%d', q, peer.address, peer.port)
    })
    
    var then = Date.now()
    
    rpc.fn_bootstrap(rpc.id, { q: 'get_peers', a: { id: rpc.id, info_hash: target } }, function(err, numberOfReplies) {
      console.log('(bootstrapped)', Date.now() - then, 'ms')
      then = Date.now();
      rpc.getPeers(target, { q: 'get_peers', a: { id: rpc.id, info_hash: target } }, visit, function (err, numberOfReplies) {
        console.log('(closest)', Date.now() - then, 'ms, numberOfReplies =', numberOfReplies)
        let get = rpc.nodes.get(target);
        console.log('get =', get);
        rpc.destroy(() => {
          console.log('destroy callback is called...');
        });
      })
    })
    
    function visit (res, peer) {
      var peers = res.r.values ? parsePeers(res.r.values) : [];
      if(peers.length) console.log('count peers:', peers.length);
    }
    
    function parsePeers (buf) {
      var peers = [];
    
      try {
        for(var i = 0; i < buf.length; i++) {
          var port = buf[i].readUInt16BE(4);
          if(!port) continue;
          peers.push({
            host: parseIp(buf[i], 0),
            port: port
          });
        }
      } catch(err) {
        // do nothing
      }
    
      return peers;
    }
    
    function parseIp(buf, offset) {
      return buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++];
    }
  }
}

new TestKRpc().main([]);