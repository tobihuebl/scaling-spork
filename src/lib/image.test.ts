import { describe, expect, it } from 'vitest';
import { fitWithin } from './image';

describe('fitWithin', () => {
  it('verkleinert auf 1600 Pixel längste Kante', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('vergrößert nie', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('akzeptiert eine andere Grenze', () => {
    expect(fitWithin(1000, 500, 500)).toEqual({ width: 500, height: 250 });
  });
});
