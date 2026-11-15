import { afterEach, describe, expect, it, vi } from 'vitest';
import { Vector2 } from 'three';
import { VfxEngine } from '../engine';
import { SurfaceRegistry } from '../registry';
import { ScrollState } from '../scroll';

afterEach(() => vi.unstubAllGlobals());

describe('native scrolling', () => {
  it('observes scroll passively, clamps bounce and releases its listener', () => {
    const browser = new EventTarget() as EventTarget & { scrollY: number };
    browser.scrollY = 0;
    vi.stubGlobal('window', browser);
    vi.stubGlobal('document', { documentElement: { scrollHeight: 2400 } });
    const listen = vi.spyOn(browser, 'addEventListener');
    const moved = vi.fn();
    const scroll = new ScrollState(moved);
    scroll.measure(800);
    expect(listen).toHaveBeenCalledWith('scroll', moved, expect.objectContaining({ passive: true }));
    browser.scrollY = 480; browser.dispatchEvent(new Event('scroll')); scroll.update(false);
    expect(scroll.y).toBe(480); expect(scroll.direction).toBe(1); expect(moved).toHaveBeenCalledTimes(1);
    browser.scrollY = -35; scroll.update(false);
    expect(scroll.y).toBe(0); expect(scroll.direction).toBe(-1); expect(scroll.top).toBe(0);
    browser.scrollY = 1900; scroll.update(false);
    expect(scroll.y).toBe(1600); expect(scroll.bottom).toBe(0);
    scroll.destroy(); browser.dispatchEvent(new Event('scroll'));
    expect(moved).toHaveBeenCalledTimes(1);
  });
  it('recomputes the bottom boundary after FAQ or viewport changes', () => {
    vi.stubGlobal('window', { scrollY: 0 });
    const root = { scrollHeight: 1800 };
    vi.stubGlobal('document', { documentElement: root });
    // A real target supplies abortable listener semantics.
    vi.stubGlobal('window', Object.assign(new EventTarget(), { scrollY: 0 }));
    const scroll = new ScrollState(() => {});
    scroll.measure(800); expect(scroll.max).toBe(1000);
    root.scrollHeight = 2100; scroll.measure(700); expect(scroll.max).toBe(1400);
    scroll.destroy();
  });
});

describe('targeted surface invalidation', () => {
  it('impulses never request a raster/layout rebuild', () => {
    const registry = new SurfaceRegistry(), listener = vi.fn();
    registry.subscribe(listener);
    const card = {} as Element;
    registry.impulse(card, .9);
    expect(listener).toHaveBeenCalledExactlyOnceWith('impulse', card, .9);
  });
  it('content changes retain the target instead of invalidating every surface', () => {
    const registry = new SurfaceRegistry(), listener = vi.fn();
    registry.subscribe(listener);
    const faq = {} as Element;
    registry.invalidate(faq);
    expect(listener).toHaveBeenCalledExactlyOnceWith('layout', faq);
  });
});

describe('viewport resizing regression', () => {
  function fixture() {
    const root = { clientWidth: 1280 };
    vi.stubGlobal('document', { documentElement: root });
    vi.stubGlobal('innerHeight', 800); vi.stubGlobal('devicePixelRatio', 1);
    // Exercise the production viewport method without constructing a WebGL context.
    const engine = Object.create(VfxEngine.prototype);
    const surface = { dirty: false };
    const target = () => ({ setSize: vi.fn() });
    Object.assign(engine, {
      viewW: 1280, viewH: 800, pixelRatio: 1, quality: 'low', viewportDirty: false,
      layoutDirty: false, renderDirty: false, metrics: { viewportResizes: 0 },
      surfaces: new Map([[{}, surface]]), canvas: { style: {} },
      renderer: { setSize: vi.fn(), setPixelRatio: vi.fn(), getContext: () => ({ drawingBufferWidth: 1280, drawingBufferHeight: 1050 }) },
      rtMain: target(), rtE: target(), rtA: target(), rtB: target(), rtS1: target(), rtS2: target(),
      grade: { uniforms: { uRes: { value: new Vector2() } } }, parts: {},
      scroll: { measure: vi.fn(), bandPx: 120 }, globals: { uView: { value: new Vector2() }, uBand: { value: 0 } },
      camera: { updateProjectionMatrix: vi.fn() },
    });
    return { engine, root, surface };
  }
  it('address bar height changes resize buffers but leave all text textures intact', () => {
    const { engine, surface } = fixture();
    vi.stubGlobal('innerHeight', 860);
    engine.resizeViewport();
    expect(surface.dirty).toBe(false); expect(engine.layoutDirty).toBe(false);
    expect(engine.renderer.setSize).toHaveBeenCalledTimes(1);
    expect(engine.scroll.measure).toHaveBeenCalledWith(860);
    engine.resizeViewport();
    expect(engine.renderer.setSize).toHaveBeenCalledTimes(1);
  });
  it('width or DPR changes invalidate text, because glyph wrapping or resolution changes', () => {
    const { engine, surface, root } = fixture();
    root.clientWidth = 390; engine.resizeViewport();
    expect(surface.dirty).toBe(true); expect(engine.layoutDirty).toBe(true);
    expect(engine.globals.uView.value.x).toBe(390);
    surface.dirty = false; engine.quality = 'high'; vi.stubGlobal('devicePixelRatio', 2);
    engine.resizeViewport(); expect(surface.dirty).toBe(true);
  });
});
