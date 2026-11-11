import { describe, expect, it } from 'vitest';
import { bandEnable, cellAbsence, fragmentation, loadingAbsence, rateFor, sampleEnergy, transformHeat } from '../structure';

const H = 900, BAND = H * 0.15;

describe('structural progress', () => {
  it('leaves the reading band fully composed', () => {
    for (let y = BAND; y <= H - BAND; y += 15) expect(fragmentation(y, H, BAND)).toBe(0);
    for (const seed of [0, 0.3, 0.99]) expect(cellAbsence(0, seed)).toBe(0);
  });

  it('grows continuously and monotonically toward both edges', () => {
    let previous = 0;
    for (let y = BAND; y >= 0; y -= 1) {
      const f = fragmentation(y, H, BAND);
      expect(f).toBeGreaterThanOrEqual(previous);
      expect(f - previous).toBeLessThan(0.02);   // no jumps
      previous = f;
    }
    expect(fragmentation(0, H, BAND)).toBe(1);
    expect(fragmentation(H, H, BAND)).toBe(1);
  });

  it('is a function of position only: reversing the scroll replays the same states', () => {
    const seeds = [0.07, 0.41, 0.83];
    const path = [400, 180, 90, 30, 90, 180, 400];   // a cell travels up into the exit band and back
    const states = path.map(y => seeds.map(s => cellAbsence(fragmentation(y, H, BAND), s)));
    expect(states[4]).toEqual(states[2]);
    expect(states[5]).toEqual(states[1]);
    expect(states[6]).toEqual(states[0]);
  });

  it('gives every cell its own stable threshold, so the front is irregular', () => {
    const f = fragmentation(BAND * 0.45, H, BAND);
    const a = [0.05, 0.35, 0.65, 0.95].map(s => cellAbsence(f, s));
    expect(a[0]).toBeGreaterThan(a[3]);
    expect(new Set(a).size).toBeGreaterThan(2);
  });

  it('lets first and last content be read whole at the ends of the document', () => {
    expect(bandEnable(0, 3000, BAND)).toEqual({ top: 0, bottom: 1 });
    expect(bandEnable(3000, 3000, BAND)).toEqual({ top: 0, bottom: 0 });
    expect(bandEnable(1500, 3000, BAND)).toEqual({ top: 1, bottom: 1 });
    expect(fragmentation(10, H, BAND, 0, 1)).toBe(0);
  });

  it('marks only cells in transition as hot', () => {
    expect(transformHeat(0)).toBe(0);
    expect(transformHeat(1)).toBe(0);
    expect(transformHeat(0.5)).toBe(1);
  });
});

describe('loading', () => {
  it('starts from nothing and ends fully present for every cell', () => {
    for (const delay of [0, 0.25, 0.5, 0.75, 1]) {
      expect(loadingAbsence(0, delay)).toBe(1);
      expect(loadingAbsence(1, delay)).toBe(0);
    }
  });
  it('joins cells in order of their delay', () => {
    expect(loadingAbsence(0.5, 0.2)).toBeLessThan(loadingAbsence(0.5, 0.8));
  });
});

describe('energy tails', () => {
  it('ends a released cell within the configured release time', () => {
    for (const seconds of [0.35, 0.8]) {
      const rate = rateFor(seconds);
      expect(sampleEnergy(1, 0, 200, seconds, rate)).toBeLessThanOrEqual(0.0201);
      expect(sampleEnergy(1, 0, 200, seconds * 0.3, rate)).toBeGreaterThan(0.2);
    }
  });
});
