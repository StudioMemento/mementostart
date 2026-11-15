import { describe, expect, it, vi } from 'vitest';
import { TouchPulseField, TOUCH_LIFE_MS, TOUCH_POOL, TOUCH_TRAVEL_MS, listenForTouch } from '../touch';
import { VfxEngine } from '../engine';
import { FIBER_LAYERS, layerCount } from '../../background/fiber-layers';
import { START_BACKGROUND } from '../../background/preset';
import { VFX } from '../config';

describe('viewport touch propagation', () => {
  it('travels from the finger to every corner, including beyond the old 110 px touch radius', () => {
    for (const [width, height, x, y] of [[390,844,25,70],[360,740,180,370],[1280,900,1240,850]]) {
      const field = new TouchPulseField();
      const wave = field.start(x,y,width,height,0);
      for (const [tx, ty] of [[0,0],[width,0],[0,height],[width,height]]) {
        const at = Math.hypot(tx-x,ty-y) / wave.reach * TOUCH_TRAVEL_MS;
        field.update(Math.max(0,at-200));
        const before = field.at(tx,ty);
        field.update(at);
        expect(field.at(tx,ty)).toBeGreaterThan(.3);
        if (at > 250) expect(field.at(tx,ty)).toBeGreaterThan(before + .2);
      }
      field.update(TOUCH_LIFE_MS);
      expect(field.active).toBe(false); expect(field.at(x,y)).toBe(0);
    }
  });
  it('reaches title rectangles only as the front arrives, even while their document position scrolls', () => {
    const field = new TouchPulseField(), wave = field.start(20,20,390,844,0);
    expect(field.across(40,620,310,90)).toBe(0);
    const elapsed = 660 / wave.reach * TOUCH_TRAVEL_MS;
    field.update(elapsed);
    expect(field.across(40,620,310,90)).toBeGreaterThan(.5);
    expect(field.across(40,1200,310,90)).toBe(0);
    // A surface at document Y 1520 after scroll 900 has the same viewport energy.
    expect(field.across(40,1520-900,310,90)).toBeGreaterThan(.5);
  });
  it('feeds distant glyph cells through the production drive method, then releases them', () => {
    const touches = new TouchPulseField(), wave = touches.start(20,20,390,844,0);
    const engine = Object.create(VfxEngine.prototype);
    Object.assign(engine,{touches,scroll:{y:900}});
    const surface = {x:40,y:1520,fontSize:64,net:{faces:2,cx:new Float32Array([30,260]),cy:new Float32Array([30,40]),weight:new Float32Array([1,1]),seed:new Float32Array([.5,.5])},chain:{drive:new Float32Array(2),driveLevel:0}};
    engine.driveRange(surface,false,-10000,-10000,110,1/60);
    expect(surface.chain.driveLevel).toBe(0);
    touches.update(650/wave.reach*TOUCH_TRAVEL_MS);
    for(let i=0;i<5;i++) engine.driveRange(surface,false,-10000,-10000,110,1/60);
    expect(surface.chain.drive[0]).toBeGreaterThan(.4);
    touches.update(TOUCH_LIFE_MS);
    for(let i=0;i<500;i++) engine.driveRange(surface,false,-10000,-10000,110,1/60);
    expect(surface.chain.driveLevel).toBe(0);
  });
  it('bounds rapid and simultaneous touches without a growing pool', () => {
    const field=new TouchPulseField();
    for(let i=0;i<100;i++) field.start(i,100,390,844,i);
    expect(field.waves).toHaveLength(TOUCH_POOL);
    expect(field.waves.at(-1)?.x).toBe(99);
    field.update(1500);expect(field.active).toBe(false);
  });
  it('uses one passive contact event; release and scroll cancellation neither duplicate nor erase it', () => {
    const target=new EventTarget(), abort=new AbortController(), field=new TouchPulseField();
    const add=vi.spyOn(target,'addEventListener');
    listenForTouch(target,(x,y)=>field.start(x,y,390,844,0),abort.signal);
    expect(add).toHaveBeenCalledWith('pointerdown',expect.any(Function),expect.objectContaining({passive:true,capture:true}));
    const fire=(type:string,pointerType='touch')=>{const e=Object.assign(new Event(type,{cancelable:true}),{pointerType,clientX:50,clientY:80});target.dispatchEvent(e);expect(e.defaultPrevented).toBe(false);};
    fire('pointerdown','mouse');expect(field.started).toBe(0);
    fire('pointerdown');fire('pointercancel');fire('pointerup');expect(field.started).toBe(1);expect(field.active).toBe(true);
    abort.abort();fire('pointerdown');expect(field.started).toBe(1);
  });
});

describe('requested five-layer clean background', () => {
  it('renders five distinct layer placements rather than clamping the request back to three', () => {
    const count=layerCount(START_BACKGROUND.layers);
    expect(count).toBe(5);
    expect(new Set(FIBER_LAYERS.slice(0,count).map(l=>l.place.join(','))).size).toBe(5);
    expect(FIBER_LAYERS.every(l=>l.place.length===4 && l.place.every(Number.isFinite) && l.gain>0)).toBe(true);
    expect(layerCount(100)).toBe(5);expect(layerCount(-1)).toBe(1);
  });
  it('removes grain from both background and content compositing', () => {
    expect(START_BACKGROUND.grain).toBe(0);expect(VFX.post.grain).toBe(0);
  });
});
