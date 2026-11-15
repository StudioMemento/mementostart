import { describe, expect, it, vi } from 'vitest';
import { TouchPulseField, TouchReaction, planTouchSeeds, touchArrival, TOUCH_POOL, listenForTouch } from '../touch';
import { buildNetwork, mulberry } from '../geometry';
import { FIBER_LAYERS, layerCount } from '../../background/fiber-layers';
import { START_BACKGROUND } from '../../background/preset';
import { VFX } from '../config';
import { BorderLight, outline } from '../border';

describe('sparse viewport touch reaction', () => {
  const network = () => buildNetwork(340, 220, 22, 20, 170, 19);
  it('plans connected paths with many visible cells while leaving most of the card dark', () => {
    const field = new TouchPulseField(), net = network();
    const first = field.start(40,40,390,844,0);
    const rect = {x:25,y:380,w:340,h:220};
    const seeds = planTouchSeeds(net,rect,first);
    expect(seeds.length).toBeGreaterThan(20); expect(seeds.length).toBeLessThanOrEqual(96);
    expect(seeds.length / net.faces).toBeLessThan(.25);
    expect(new Set(seeds.map(s=>Math.round(s.at/30))).size).toBeGreaterThan(1);
    const second = field.start(40,40,390,844,30);
    expect(planTouchSeeds(net,rect,second).map(s=>s.cell)).not.toEqual(seeds.map(s=>s.cell));
    expect(planTouchSeeds(net,{...rect,y:1000},first)).toHaveLength(0);
  });
  it('reaches distant visible glyphs; equal distances have different arrival times', () => {
    const field = new TouchPulseField(), w=field.start(195,422,390,844,0);
    expect(touchArrival(w,195,800)).toBeLessThan(900);
    expect(touchArrival(w,195,44)).not.toBe(touchArrival(w,195,800));
    const net=network(); net.weight.fill(0);
    net.weight[20]=1;
    expect(planTouchSeeds(net,{x:20,y:400,w:340,h:220},w).map(s=>s.cell)).toEqual([20]);
  });
  it('branches through neighbours with short decay while leaving most cells dark', () => {
    const field = new TouchPulseField(), net=network();
    const reaction=new TouchReaction(net,mulberry(1));
    const lit=new Set<number>(); let maxSimultaneous=0,peak=0,borderPeak=0;
    const border=new BorderLight();
    const edges=Array.from({length:net.faces},(_,cell)=>{const [s,d]=outline(net.cx[cell],net.cy[cell],340,220);return {cell,s,w:Math.max(0,1-d/46)}});
    field.start(20,20,390,844,0);
    for(let ms=0;ms<2700;ms+=1000/60){
      field.beginFrame(ms);reaction.step(field,{x:25,y:400,w:340,h:220},ms,1/60);
      peak=Math.max(peak,reaction.level);border.decay(1/60);reaction.feedBorder(border,edges);border.settle();borderPeak=Math.max(borderPeak,border.level);
      reaction.chain.shown.forEach((e,i)=>{if(e>.025)lit.add(i)});
      maxSimultaneous=Math.max(maxSimultaneous,reaction.chain.shown.filter(e=>e>.025).length);
    }
    expect(lit.size).toBeGreaterThan(20); expect(peak).toBeGreaterThan(.55); expect(borderPeak).toBeGreaterThan(.5);
    expect(maxSimultaneous/net.faces).toBeLessThan(.3);
    expect(reaction.active).toBe(false); expect(reaction.level).toBeLessThan(.003);
    expect(reaction.chain.drive.every(v=>v===0)).toBe(true);
  });
  it('clears detached surfaces and does not replay old contacts on newly visible content',()=>{
    const field=new TouchPulseField(),reaction=new TouchReaction(network(),mulberry(3));
    field.start(20,20,390,844,0);
    field.beginFrame(0);field.beginFrame(400);
    reaction.step(field,{x:20,y:400,w:340,h:220},400,1/60);
    expect(reaction.active).toBe(false);
    field.start(20,20,390,844,410);
    field.beginFrame(410);reaction.step(field,{x:20,y:400,w:340,h:220},410,1/60); expect(reaction.active).toBe(true);
    reaction.clear();expect(reaction.active).toBe(false);
  });
  it('keeps the reaction after a slow first render and a later dropped frame',()=>{
    const field=new TouchPulseField(),reaction=new TouchReaction(network(),mulberry(1));
    field.start(20,20,390,844,0);let peak=0,lit=0;
    reaction.chain.onIgnite=()=>lit++;
    for(let ms=240;ms<2300;ms+=ms===640?180:40){
      field.beginFrame(ms);reaction.step(field,{x:25,y:400,w:340,h:220},ms,.04);peak=Math.max(peak,reaction.level);
    }
    expect(lit).toBeGreaterThan(20);expect(peak).toBeGreaterThan(.55);
  });
  it('travels between separate boards and reaches a distant title network',()=>{
    const field=new TouchPulseField(),near=new TouchReaction(network()),far=new TouchReaction(network());
    field.start(20,20,390,844,0);let firstNear=Infinity,firstFar=Infinity;
    for(let ms=0;ms<2300;ms+=20){
      field.beginFrame(ms);near.step(field,{x:25,y:100,w:340,h:220},ms,.02);far.step(field,{x:25,y:590,w:340,h:220},ms,.02);
      if(near.level>.3)firstNear=Math.min(firstNear,ms);if(far.level>.3)firstFar=Math.min(firstFar,ms);
    }
    expect(firstNear).toBeLessThan(firstFar);expect(firstFar).toBeLessThan(1000);
    expect(near.active).toBe(false);expect(far.active).toBe(false);
  });
  it('bounds rapid and simultaneous touches without a growing pool', () => {
    const field=new TouchPulseField();
    for(let i=0;i<100;i++) field.start(i,100,390,844,i);
    expect(field.waves).toHaveLength(TOUCH_POOL);
    expect(field.waves.at(-1)?.x).toBe(99);
    field.update(2600);expect(field.active).toBe(false);
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
