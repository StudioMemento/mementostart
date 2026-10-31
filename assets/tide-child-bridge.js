/* Memento Tide v014. Bidirectional scroll transport with negotiated v012 compatibility. Runs only when embedded; observes scrolling, never form data. */
(()=>{
  if(window.parent===window)return;
  const script=document.currentScript,selector=script?.dataset.tideScrollRoot;
  const endSelector=script?.dataset.tideEndSelector,resetSelector=script?.dataset.tideResetSelector,blockSelector=script?.dataset.tideBlockSelector,nextSelector=script?.dataset.tideNextSelector;
  const startSelector=script?.dataset.tideStartSelector,prevSelector=script?.dataset.tidePrevSelector,lastSelector=script?.dataset.tideLastSelector,stepSelector=script?.dataset.tideStepSelector;
  const allowed=(script?.dataset.tideParents||'').split(',').map(s=>s.trim()).filter(Boolean);
  let origin;try{origin=new URL(document.referrer).origin;}catch{return;}
  if(allowed.length&&!allowed.includes(origin))return;
  const root=()=>selector?document.querySelector(selector):document.scrollingElement;
  const modal=()=>document.querySelector('dialog[open], [aria-modal="true"]:not([hidden])')||(blockSelector&&document.querySelector(blockSelector));
  const editing=target=>target?.closest?.('input,textarea,select,[contenteditable=true]');
  let scrub=false,phase="content",boundary="start",scrubTouch=null,modernLast=-Infinity,modernSign=0,virtualGesture=false;
  let session=null,active=false,sentEnd=false,activeAt=0,lastWheel=-Infinity,wheelEligible=false,debt=0,touch=null,pointerTouch=null,lastReport=-Infinity,virtualLock=0;
  function send(type,payload={}){if(session)parent.postMessage({...session,type,payload},origin);}
  function metrics(){const r=root();return r?{top:r.scrollTop,viewport:r.clientHeight,height:r.scrollHeight}:null;}
  function atEnd(){if(endSelector)return !!document.querySelector(endSelector);const m=metrics();return !!m&&m.viewport>0&&m.top+m.viewport>=m.height-3;}
  function ready(){return !scrub&&active&&!sentEnd&&performance.now()-activeAt>=700&&!modal();}
  function reset(){const r=root();if(r)r.scrollTo({top:0,left:0,behavior:'instant'});if(resetSelector)document.querySelector(resetSelector)?.click();sentEnd=false;debt=0;lastWheel=-Infinity;wheelEligible=false;touch=null;pointerTouch=null;}
  function finish(event){if(!ready()||!atEnd())return;sentEnd=true;event?.preventDefault?.();event?.stopImmediatePropagation?.();send('END',{reason:'continued-downward-input'});}
  function nestedCanScroll(target){
    for(let el=target instanceof Element?target:null;el&&el!==root()&&el!==document.body;el=el.parentElement){
      if(el.scrollHeight>el.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)&&el.scrollTop+el.clientHeight<el.scrollHeight-2)return true;
    }return false;
  }
  addEventListener('message',event=>{
    const d=event.data;if(event.source!==parent||event.origin!==origin||d?.channel!=='memento:tide'||d.version!==1)return;
    if(d.type==='INIT'&&typeof d.sessionId==='string'&&d.sessionId.length<160&&/^s\d{2}_[a-z]+$/.test(d.stageId)){
      scrub=d.payload?.scrub===true;phase='content';
      session={channel:d.channel,version:1,sessionId:d.sessionId,stageId:d.stageId};active=false;reset();send('READY',{bridgeVersion:'v014',supportsEnd:true,supportsScrub:true,scrollRoot:selector||'document'});
    }else if(session&&d.sessionId===session.sessionId&&d.stageId===session.stageId&&d.type==='VISIBILITY'){
      const next=d.payload?.active===true;
      if(scrub){
        if(next&&!active)sentEnd=false;active=next;phase=d.payload?.phase==='transition'?'transition':'content';boundary=d.payload?.boundary==='end'?'end':'start';
        if(d.payload?.position==='start'){const r=root();if(r)r.scrollTo({top:0,left:0,behavior:'instant'});if(resetSelector)document.querySelector(resetSelector)?.click();}
        if(d.payload?.position==='end'){const r=root();if(r)r.scrollTo({top:r.scrollHeight,left:0,behavior:'instant'});if(lastSelector)document.querySelector(lastSelector)?.click();}
        if(!active)scrubTouch=null;return;
      }
      if(next&&!active){if(sentEnd)reset();activeAt=performance.now();lastWheel=-Infinity;debt=0;}
      active=next;if(!active){touch=null;wheelEligible=false;debt=0;}
    }
  });
  // An explicit click/Enter uses the same END contract understood by the hub.
  const exitSelector=script?.dataset.tideExitSelector;
  if(exitSelector)document.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    if(!event.target.closest?.(exitSelector))return;
    if(!session)return; // An unconnected iframe retains the real hub link.
    event.preventDefault();
    if(!active||phase!=='content'||modal()||sentEnd)return;
    sentEnd=true;send('END',{reason:'explicit-explore'});
  });
  addEventListener('scroll',()=>{
    if(!active)return;const m=metrics();if(!m)return;
    if(performance.now()-lastReport>150){lastReport=performance.now();send('SCROLL',m);}
    // Reaching the last pixel is not an instruction to leave the page.
    if(!atEnd())wheelEligible=false;
  },{passive:true,capture:true});
  addEventListener('wheel',event=>{
    if(scrub){modernWheel(event);return;}
    const now=performance.now(),fresh=now-lastWheel>220;
    if(fresh){wheelEligible=atEnd();debt=0;}lastWheel=now;
    if(!ready()||event.ctrlKey||editing(event.target)||Math.abs(event.deltaX||0)>Math.abs(event.deltaY)||event.deltaY<=0){debt=0;return;}
    if(nestedCanScroll(event.target)){wheelEligible=false;debt=0;return;}
    if(!atEnd()){
      wheelEligible=false;
      if(nextSelector&&fresh&&now>=virtualLock){document.querySelector(nextSelector)?.click();virtualLock=now+700;event.preventDefault();}
      debt=0;return;
    }
    if(now<virtualLock)return;
    if(!wheelEligible)return;
    debt+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?metrics().viewport:1);
    if(debt>=(endSelector?24:72))finish(event);
  },{passive:false,capture:true});
  addEventListener('touchstart',event=>{
    if(scrub){scrubTouch=event.touches.length===1&&active&&!modal()&&!editing(event.target)?{x:event.touches[0].clientX,y:event.touches[0].clientY,lastY:event.touches[0].clientY,target:event.target,axis:null,captured:false}:null;return;}
    touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY,eligible:ready()&&atEnd()&&!nestedCanScroll(event.target)&&!editing(event.target)}:null;
  },{passive:true,capture:true});
  addEventListener('touchend',event=>{
    if(scrub){scrubTouch=null;return;}
    const p=event.changedTouches[0],start=touch;touch=null;if(!p||!start?.eligible)return;
    const dy=start.y-p.clientY,dx=Math.abs(start.x-p.clientX);
    if(dy>55&&dy>dx*1.2)finish(event);
  },{passive:false,capture:true});
  addEventListener('touchcancel',()=>{touch=null;scrubTouch=null;},{passive:true});
  // Virtual pages such as Studio consume Pointer Events instead of native scroll.
  addEventListener('pointerdown',event=>{
    if(scrub)return;
    if(!endSelector||event.pointerType!=='touch')return;
    pointerTouch=event.isPrimary?{id:event.pointerId,x:event.clientX,y:event.clientY,eligible:ready()&&atEnd()&&!editing(event.target)}:null;
  },{passive:true,capture:true});
  addEventListener('pointerup',event=>{
    if(scrub){
      if(scrubTouch?.captured){event.preventDefault();event.stopImmediatePropagation();if(typeof PointerEvent!=='undefined')event.target?.dispatchEvent?.(new PointerEvent('pointercancel',{pointerId:event.pointerId,pointerType:'touch',bubbles:true}));}
      return;
    }
    const start=pointerTouch;if(!start||event.pointerId!==start.id)return;pointerTouch=null;
    const dy=start.y-event.clientY,dx=Math.abs(start.x-event.clientX);
    if(start.eligible&&dy>55&&dy>dx*1.2){
      finish(event);
      if(sentEnd&&typeof PointerEvent!=='undefined')event.target?.dispatchEvent?.(new PointerEvent('pointercancel',{pointerId:event.pointerId,pointerType:'touch',bubbles:true}));
    }
  },{passive:false,capture:true});
  addEventListener('pointercancel',()=>{pointerTouch=null;},{passive:true,capture:true});
  addEventListener('keydown',event=>{
    if(scrub){modernKey(event);return;}
    if(!active||modal()||editing(event.target)||event.defaultPrevented)return;
    if(event.key==='Escape'){send('ESCAPE');return;}
    if(!event.repeat&&!event.shiftKey&&['PageDown','End','ArrowDown',' '].includes(event.key)&&!nestedCanScroll(event.target))finish(event);
  },{capture:true});

  function atStart(){if(startSelector)return !!document.querySelector(startSelector);const m=metrics();return !!m&&m.top<=2;}
  function nestedConsumes(target,delta){
    for(let el=target instanceof Element?target:null;el&&el!==root()&&el!==document.body;el=el.parentElement){
      if(el.scrollHeight>el.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)&&
        (delta<0?el.scrollTop>1:el.scrollTop+el.clientHeight<el.scrollHeight-2))return true;
    }return false;
  }
  function consume(delta,event){
    if(!active||modal()||editing(event.target)||!Number.isFinite(delta)||Math.abs(delta)<.01)return false;
    if(phase!=='transition'&&nestedConsumes(event.target,delta))return false;
    const edge=phase==='transition'?boundary:delta<0&&atStart()?'start':delta>0&&atEnd()?'end':null;
    if(!edge)return false;
    if(event.cancelable===false&&event.type==='touchmove')return false;
    event.preventDefault?.();event.stopImmediatePropagation?.();
    boundary=edge;phase='transition';send('INPUT',{boundary:edge,delta:Math.max(-2400,Math.min(2400,delta))});return true;
  }
  function modernWheel(event){
    if(event.ctrlKey||Math.abs(event.deltaX||0)>Math.abs(event.deltaY))return;
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?(metrics()?.viewport||800):1);
    const now=performance.now(),sign=Math.sign(delta),fresh=now-modernLast>180||sign!==modernSign;modernLast=now;modernSign=sign;
    if(fresh)virtualGesture=false;
    // A gallery step must not turn into an outer-page exit on its last wheel packet.
    // Reversing direction starts a new gesture immediately; no transition cooldown.
    if(endSelector&&phase!=='transition'&&virtualGesture&&!fresh){event.preventDefault();event.stopImmediatePropagation();return;}
    if(consume(delta,event))return;
    if(!active||modal()||editing(event.target)||nestedConsumes(event.target,delta))return;
    if(stepSelector){
      const items=[...document.querySelectorAll(stepSelector)],index=items.findIndex(el=>['true','page'].includes(el.getAttribute('aria-current')));
      const item=items[index+sign];
      if(index>=0&&item){event.preventDefault();event.stopImmediatePropagation();item.click();virtualGesture=true;}
      return;
    }
    const selector=delta>0?nextSelector:prevSelector;
    if(selector){event.preventDefault();event.stopImmediatePropagation();document.querySelector(selector)?.click();virtualGesture=true;}
  }
  addEventListener('touchmove',event=>{
    if(!scrub||!scrubTouch||event.touches.length!==1)return;
    const p=event.touches[0],g=scrubTouch,dx=p.clientX-g.x,dy=p.clientY-g.y;
    if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>7)g.axis=Math.abs(dy)>Math.abs(dx)*1.1?'y':'x';
    const delta=g.lastY-p.clientY;g.lastY=p.clientY;
    if(g.axis==='y'&&consume(delta,event))g.captured=true;
  },{passive:false,capture:true});
  function modernKey(event){
    if(!active||modal()||editing(event.target)||event.defaultPrevented)return;
    if(event.key==='Escape'){send('ESCAPE');return;}
    const up=['ArrowUp','PageUp','Home'].includes(event.key)||(event.key===' '&&event.shiftKey),down=['ArrowDown','PageDown','End',' '].includes(event.key);
    if(!up&&!down)return;
    const delta=(up?-1:1)*(event.key.startsWith('Arrow')?100:(metrics()?.viewport||800)*.7);
    if(consume(delta,event)||!endSelector||event.repeat)return;
    let item;
    if(stepSelector){const items=[...document.querySelectorAll(stepSelector)],index=items.findIndex(el=>['true','page'].includes(el.getAttribute('aria-current')));if(index>=0)item=items[index+(up?-1:1)];}
    else {const sel=up?prevSelector:nextSelector;if(sel)item=document.querySelector(sel);}
    if(item){event.preventDefault();event.stopImmediatePropagation?.();item.click();}
  }
})();
