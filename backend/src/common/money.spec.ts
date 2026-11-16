import { toMillimes, toTnd } from './money';

describe('money', () => {
  it('converts TND <-> millimes without float drift', () => {
    expect(toMillimes(24.5)).toBe(24500);
    expect(toMillimes(0.1 + 0.2)).toBe(300);
    expect(toTnd(24500)).toBe(24.5);
    expect(toTnd(1)).toBe(0.001);
  });
});
