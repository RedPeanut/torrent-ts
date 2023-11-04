
export default class Util {

  static toBuffer(str: string | Buffer | ArrayBuffer) {
    if(Buffer.isBuffer(str)) return str;
    if(ArrayBuffer.isView(str)) return Buffer.from(str.buffer, str.byteOffset, str.byteLength);
    if(typeof str === 'string') return Buffer.from(str, 'hex');
    throw new Error('Pass a buffer or a string');
  }

}