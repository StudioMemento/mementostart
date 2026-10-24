/** Decide a navigation gesture without consuming vertical scroll or zoom. */
export function swipeDirection({ dx, dy, elapsed, width }) {
  const distance = Math.max(52, Math.min(96, width * 0.14));
  if (elapsed < 0 || elapsed > 1000 || Math.abs(dx) < distance || Math.abs(dx) < Math.abs(dy) * 1.6) return null;
  return dx < 0 ? 'left' : 'right';
}

/** Touch and pen only. Native clicks, editable controls and multitouch stay native. */
export function attachSwipe(surface, { onLeft, onRight, disabled = () => false }) {
  const ignored = 'a,button,input,textarea,select,label,form,details,pre,[contenteditable],[data-no-swipe]';
  let gesture = null;
  let blockClickUntil = 0;
  const pointers = new Set();
  const cancel = () => { gesture = null; };
  const clear = () => { gesture = null; pointers.clear(); };

  window.addEventListener('pointerdown', event => {
    if (gesture && event.pointerId !== gesture.id && (event.pointerType === 'touch' || event.pointerType === 'pen')) cancel();
  }, {passive:true,capture:true});

  surface.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    pointers.add(event.pointerId);
    if (pointers.size !== 1 || event.isPrimary === false) { cancel(); return; }
    if (disabled() || event.target.closest(ignored) || window.getSelection()?.toString()) return;
    const width = document.documentElement.clientWidth || window.innerWidth;
    // Reserve the edges for operating-system / browser back gestures.
    if (event.clientX < 24 || event.clientX > width - 24) return;
    gesture = { id:event.pointerId, x:event.clientX, y:event.clientY, time:event.timeStamp, width:surface.getBoundingClientRect().width };
  }, {passive:true});

  window.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = Math.abs(event.clientX - gesture.x), dy = Math.abs(event.clientY - gesture.y);
    if (dy > 12 && dy > dx * 1.2) cancel();
  }, {passive:true});

  window.addEventListener('pointerup', event => {
    pointers.delete(event.pointerId);
    if (!gesture || event.pointerId !== gesture.id) return;
    const previous = gesture;
    cancel();
    if (disabled() || window.getSelection()?.toString()) return;
    const direction = swipeDirection({dx:event.clientX-previous.x,dy:event.clientY-previous.y,elapsed:event.timeStamp-previous.time,width:previous.width});
    if (!direction) return;
    const handled = direction === 'left' ? onLeft() : onRight();
    if (handled) blockClickUntil = performance.now() + 400;
  }, {passive:true});

  window.addEventListener('pointercancel', event => {
    pointers.delete(event.pointerId);
    if (gesture?.id === event.pointerId) cancel();
  }, {passive:true});

  surface.addEventListener('click', event => {
    // Never activate a card when a completed swipe ends above it.
    if (event.detail !== 0 && performance.now() < blockClickUntil) {
      event.preventDefault(); event.stopPropagation();
    }
  }, true);
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
}
