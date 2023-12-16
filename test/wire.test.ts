import Wire from '../src/Wire';

describe('description', () => {
  it('handshake', () => {
    const wire = new Wire({});
    wire.on('error', err => {})
    wire.pipe(wire)
    wire.on('handshake', (infoHash, peerId) => {
      expect(Buffer.from(infoHash, 'hex').length).toBe(20);
      expect(Buffer.from(infoHash, 'hex').toString()).toBe('01234567890123456789');
      expect(Buffer.from(peerId, 'hex').length).toBe(20);
      expect(Buffer.from(peerId, 'hex').toString()).toBe('12345678901234567890');
    });
    wire.handshake(Buffer.from('01234567890123456789'), Buffer.from('12345678901234567890'));
  });
});