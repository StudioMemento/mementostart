import { describe, expect, it, vi } from 'vitest';
import { TouchPulseField, TouchReaction, planTouchSeeds, touchArrival, TOUCH_POOL, listenForTouch } from '../touch';
import { buildNetwork, mulberry } from '../geometry';
import { FIBER_LAYERS, layerCount } from '../../background/fiber-layers';
import { START_BACKGROUND } from '../../background/preset';
import { VFX } from '../config';

describe('sparse viewport touch reaction', () => {
  const network = () => buildNetwork(340, 220, 22, 20, 170, 19);
  it('seeds separated cells rather than lighting a radial band or an entire card', () => {
    const field = new TouchPulseField(), net = network();
    const first = field.start(40,40,390,844,0);
    const rect = {x:25,y:380,w:340,h:220};
    const seeds = planTouchSeeds(net,rect,first);
    expect(seeds.length).toBeGreaterThan(1); expect(seeds.length).toBeLessThanOrEqual(5);
    expect(seeds.length / net.faces).toBeLessThan(.03);
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
    const lit=new Set<number>(); let descendants=0,maxSimultaneous=0;
    reaction.chain.onIgnite=(_cell,_s,gen)=>{if(gen>0) descendants++};
    field.start(20,20,390,844,0);
    for(let ms=0;ms<1600;ms+=1000/60){
      field.update(ms);reaction.step(field,{x:25,y:400,w:340,h:220},ms,1/60);
      reaction.chain.shown.forEach((e,i)=>{if(e>.025)lit.add(i)});
      maxSimultaneous=Math.max(maxSimultaneous,reaction.chain.shown.filter(e=>e>.025).length);
    }
    expect(descendants).toBeGreaterThan(0); expect(lit.size).toBeGreaterThan(3);
    expect(maxSimultaneous/net.faces).toBeLessThan(.15);
    expect(reaction.active).toBe(false); expect(reaction.level).toBeLessThan(.003);
    expect(reaction.chain.drive.every(v=>v===0)).toBe(true);
  });
  it('clears detached surfaces and does not replay old contacts on newly visible content',()=>{
    const field=new TouchPulseField(),reaction=new TouchReaction(network(),mulberry(3));
    field.start(20,20,390,844,0);
    reaction.step(field,{x:20,y:400,w:340,h:220},400,1/60);
    expect(reaction.active).toBe(false);
    field.start(20,20,390,844,410);
    reaction.step(field,{x:20,y:400,w:340,h:220},410,1/60); expect(reaction.active).toBe(true);
    reaction.clear();expect(reaction.active).toBe(false);
  });
  it('bounds rapid and simultaneous touches without a growing pool', () => {
    const field=new TouchPulseField();
    for(let i=0;i<100;i++) field.start(i,100,390,844,i);
    expect(field.waves).toHaveLength(TOUCH_POOL);
    expect(field.waves.at(-1)?.x).toBe(99);
    field.update(1600);expect(field.active).toBe(false);
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
