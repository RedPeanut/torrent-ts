import Cmd from '../src/Cmd';

describe('description', () => {
  it('testcase', () => {
    new Cmd().exec([]);
    expect(1).toBe(1);
  });
});