import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error Standalone navigation is shared verbatim with the prerendered HTML.
import { bindNavViewport, syncNavViewport } from '../../../public/navigation/viewport.mjs';
afterEach(()=>vi.unstubAllGlobals());
describe('mobile navbar viewport',()=>{
  it('sets its height synchronously before any scroll, including restored pages and toolbar changes',()=>{
    const view=Object.assign(new EventTarget(),{height:740,scale:1});
    const browser=Object.assign(new EventTarget(),{innerHeight:844,visualViewport:view});
    vi.stubGlobal('window',browser);
    let pending:FrameRequestCallback|undefined;
    vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{pending=fn;return 1});
    vi.stubGlobal('cancelAnimationFrame',vi.fn());
    const nav={style:{setProperty:vi.fn()}};
    const stop=bindNavViewport(nav);
    expect(nav.style.setProperty).toHaveBeenLastCalledWith('--memento-nav-height','740px');
    view.height=812;view.dispatchEvent(new Event('resize'));pending?.(0);
    expect(nav.style.setProperty).toHaveBeenLastCalledWith('--memento-nav-height','812px');
    view.height=720;browser.dispatchEvent(new Event('pageshow'));
    expect(nav.style.setProperty).toHaveBeenLastCalledWith('--memento-nav-height','720px');
    stop();nav.style.setProperty.mockClear();browser.dispatchEvent(new Event('pageshow'));
    expect(nav.style.setProperty).not.toHaveBeenCalled();
  });
  it('falls back to the viewport height and does not shrink the navigation with pinch zoom',()=>{
    vi.stubGlobal('window',{innerHeight:844});
    const nav={style:{setProperty:vi.fn()}};
    syncNavViewport(nav,null);expect(nav.style.setProperty).toHaveBeenLastCalledWith('--memento-nav-height','844px');
    syncNavViewport(nav,{height:422,scale:2});expect(nav.style.setProperty).toHaveBeenLastCalledWith('--memento-nav-height','844px');
  });
});
