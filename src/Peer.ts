import Wire from './Wire';
import Torrent from './Torrent';
import net from 'net';
const debug = require('debug')('peer');

const CONNECT_TIMEOUT_TCP = 5000;
const CONNECT_TIMEOUT_UTP = 5000;
const HANDSHAKE_TIMEOUT = 25000;

export default class Peer {

  public static createTCPOutgoingPeer(addr: string, swarm: Torrent): Peer {
    return Peer._createOutgoingPeer(addr, swarm, 'tcpOutgoing');
  }

  private static _createOutgoingPeer(addr: string, swarm: Torrent, type: string): Peer {
    const peer = new Peer(addr, type);
    peer.addr = addr;
    peer.swarm = swarm;
    return peer;
  }

  id: string; /* ip:port string */
  type: string;

  addr: string; /* ip:port string */
  swarm: Torrent;
  wire: Wire;
  conn: net.Socket;

  /**
   * 
   * @param {string} id 
   * @param {string} type 
   */
  constructor(id: string, type: string) {
    this.id = id;
    this.type = type;
  }

  onConnect() {
    debug('Peer %s connected', this.id);
    // const conn = this.conn;
    const wire = this.wire = new Wire(this.type);
    wire.once('handshake', (infoHash, peerId) => {
      this.onHandshake(infoHash, peerId)
    });
    this.startHandshakeTimeout();
    this.handshake();
  }

  /**
   * 
   * @param {string} infoHash 
   * @param {string} peerId 
   */
  onHandshake(infoHash: string, peerId: string) {

  }

  connectTimeout: NodeJS.Timeout|string|number = null;
  handshakeTimeout: NodeJS.Timeout|string|number = null;
  
  startConnectTimeout () {
    clearTimeout(this.connectTimeout);

    const connectTimeoutValues = {
      // webrtc: CONNECT_TIMEOUT_WEBRTC,
      tcpOutgoing: CONNECT_TIMEOUT_TCP,
      utpOutgoing: CONNECT_TIMEOUT_UTP
    };

    this.connectTimeout = setTimeout(() => {
      this.destroy(new Error('connect timeout'))
    }, connectTimeoutValues[this.type]);
    if(this.connectTimeout.unref) this.connectTimeout.unref();
  }

  startHandshakeTimeout() {
    clearTimeout(this.handshakeTimeout);
    this.handshakeTimeout = setTimeout(() => {
      this.destroy(new Error('handshake timeout'));
    }, HANDSHAKE_TIMEOUT);
    if(this.handshakeTimeout.unref) this.handshakeTimeout.unref();
  }

  destroyed: boolean = false;

  destroy(err: Error) {
    if(this.destroyed) return;
    this.destroyed = true;

    debug('destroy %s %s (error: %s)', this.type, this.id, err && (err.message || err));

    clearTimeout(this.connectTimeout);
    clearTimeout(this.handshakeTimeout);

    const swarm = this.swarm;
    const conn = this.conn;
    const wire = this.wire;

    this.swarm = null;
    this.conn = null;
    this.wire = null;

  }

  handshake() {
    // this.wire.handshake(this.swarm.infoHash, this.swarm.client.peerId);
  }

}
