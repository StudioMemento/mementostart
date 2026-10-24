import { attachSwipe } from './gesture.3be0453ab8ab.mjs';

(() => {
  'use strict';
  const root = document.getElementById('memento-contact');
  const $ = id => root.querySelector('#' + id);
  const config = JSON.parse(document.getElementById('memento-contact-config').textContent);
  const fields = ['name','email','phone','message'];
  const form = $('mm-form');
  const submit = $('mm-submit');
  let busy = false;
  let draft = '';
  let requestId = '';
  let requestSignature = '';
  const safeHttps = value => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
    catch { return ''; }
  };
  const endpoint = safeHttps(config.endpoint);
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(config.email) ? config.email : 'info@mementostudio.it';
  const emailHref = 'mailto:' + email;
  root.querySelectorAll('[data-email-link]').forEach(a => { a.href = emailHref; a.target = '_blank'; a.rel = 'noopener'; });
  root.querySelectorAll('[data-email-text]').forEach(el => { el.textContent = email; });
  root.querySelector('.mm-title').hidden = config.showTitle === false;
  function setChannel(id, url) {
    const el = $(id);
    if (url) { el.href = url; el.removeAttribute('aria-disabled'); el.removeAttribute('tabindex'); }
    else { el.removeAttribute('href'); el.setAttribute('aria-disabled','true'); el.setAttribute('tabindex','-1'); el.querySelector('.mm-channel-copy').textContent = 'Non disponibile'; }
  }
  const phone = String(config.phone || '').replace(/[\s().-]/g,'');
  const whatsapp = String(config.whatsapp || '').replace(/\D/g,'');
  setChannel('mm-phone-link', /^\+\d{7,15}$/.test(phone) ? 'tel:' + phone : '');
  setChannel('mm-whatsapp-link', /^\d{7,15}$/.test(whatsapp) ? 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(config.whatsappMessage || 'Ciao Memento! Vorrei parlarvi di un’idea.') : '');
  setChannel('mm-instagram-link', /^[a-zA-Z0-9._]{1,30}$/.test(config.instagram || '') ? 'https://ig.me/m/' + config.instagram : '');
  if (safeHttps(config.privacyUrl)) { $('mm-privacy').hidden = false; $('mm-privacy-link').href = safeHttps(config.privacyUrl); }
  if (endpoint) { $('mm-submit-label').textContent = 'Invia messaggio'; $('mm-method-note').textContent = 'Ti rispondiamo via email.'; }
  else if (config.endpoint) { console.warn('Memento: endpoint non valido. Modalità email attiva.'); }

  function announce(message) { $('mm-announcement').textContent = message; }
  function focusAt(el) {
    el.focus({preventScroll:true});
    const bounds = el.getBoundingClientRect();
    if (bounds.top < 16 || bounds.bottom > window.innerHeight - 16) el.scrollIntoView({block:'nearest',behavior:'auto'});
  }
  function openCompose() {
    if (busy || !$('mm-compose').hidden) return false;
    root.dataset.direction = 'forward';
    root.dataset.view = 'compose';
    $('mm-choose').hidden = true;
    $('mm-compose').hidden = false;
    $('mm-email-button').setAttribute('aria-expanded','true');
    focusAt($('mm-result').hidden ? $('mm-form-title') : $('mm-result-title'));
    scheduleLayout();
    return true;
  }
  function showChannels() {
    if (busy || $('mm-compose').hidden) return false;
    root.dataset.direction = 'back';
    root.dataset.view = 'choose';
    $('mm-compose').hidden = true;
    $('mm-choose').hidden = false;
    $('mm-email-button').setAttribute('aria-expanded','false');
    focusAt($('mm-email-button'));
    return true;
  }
  $('mm-email-button').addEventListener('click', openCompose);
  $('mm-back').addEventListener('click', showChannels);
  attachSwipe(root.querySelector('.mm-surface'), {onLeft:openCompose,onRight:showChannels,disabled:() => busy});
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.isComposing || $('mm-compose').hidden || busy) return;
    if (event.target.matches('input,textarea')) { event.target.blur(); return; }
    event.preventDefault(); showChannels();
  });


  function value(name) { return $('mm-' + name).value.trim(); }
  function errorFor(name) {
    const input = $('mm-' + name), val = value(name);
    if (name === 'name' && !val) return 'Come ti chiami?';
    if (name === 'email' && (!val || input.validity.typeMismatch)) return 'Inserisci un indirizzo email valido.';
    if (name === 'phone' && val && (!/^[+\d\s().\-]+$/.test(val) || val.replace(/\D/g,'').length < 6 || val.replace(/\D/g,'').length > 15)) return 'Controlla il numero, oppure lascia vuoto il campo.';
    if (name === 'message' && !val) return 'Raccontaci cosa hai in mente.';
    if (val.length > input.maxLength) return 'Il testo supera il limite del campo.';
    return '';
  }
  function showError(name, message) {
    const input = $('mm-' + name), note = $('mm-' + name + '-error');
    note.textContent = message;
    note.hidden = !message;
    if (message) input.setAttribute('aria-invalid','true'); else input.removeAttribute('aria-invalid');
  }
  function validate() {
    let first = '';
    fields.forEach(name => { const error = errorFor(name); showError(name,error); if (error && !first) first = name; });
    if (first) { announce('Controlla i campi indicati.'); focusAt($('mm-' + first)); return false; }
    announce(''); return true;
  }
  fields.forEach(name => {
    const input = $('mm-' + name);
    input.addEventListener('blur', () => { if (value(name) || input.getAttribute('aria-invalid') === 'true') showError(name,errorFor(name)); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') showError(name,errorFor(name));
      $('mm-send-error').hidden = true;
      $('mm-email-fallback').hidden = true;
    });
  });
  function composeDraft() {
    const contact = Object.fromEntries(fields.map(name => [name,value(name)]));
    const lines = ['Ciao Memento,','',contact.message,'','—',contact.name,'Email: ' + contact.email];
    if (contact.phone) lines.push('Telefono: ' + contact.phone);
    draft = lines.join('\n');
    $('mm-draft').textContent = draft;
    const subject = 'Un nuovo inizio — ' + contact.name.replace(/[\r\n]/g,' ');
    const mailto = emailHref + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(draft);
    const long = mailto.length > 1800;
    $('mm-open-email').href = long ? emailHref + '?subject=' + encodeURIComponent(subject) : mailto;
    $('mm-result-description').textContent = long ? 'Il messaggio è lungo: copia il testo, poi apri l’email e incollalo. Non abbiamo tagliato nulla.' : 'Aprila nella tua app di posta e inviala quando vuoi.';
    $('mm-copy-status').textContent = '';
    $('mm-draft-details').open = long;
    return contact;
  }
  function showDraft() {
    composeDraft();
    form.hidden = true;
    $('mm-result').hidden = false;
    focusAt($('mm-result-title'));
    announce('Email preparata. Devi ancora inviarla dalla tua app di posta.');
  }
  $('mm-edit').addEventListener('click', () => {
    $('mm-result').hidden = true;
    form.hidden = false;
    focusAt($('mm-message'));
    scheduleLayout();
  });
  $('mm-copy').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(draft);
      $('mm-copy-status').textContent = 'Testo copiato. Ora puoi incollarlo nella tua email.';
    } catch {
      $('mm-draft-details').open = true;
      const range = document.createRange();
      range.selectNodeContents($('mm-draft'));
      const selection = window.getSelection();
      selection.removeAllRanges(); selection.addRange(range);
      focusAt($('mm-draft'));
      $('mm-copy-status').textContent = 'Copia automatica non disponibile. Il testo è qui: selezionalo e copialo.';
    }
  });
  $('mm-email-fallback').addEventListener('click', () => { if (validate()) showDraft(); });

  async function deliver() {
    const contact = composeDraft();
    const signature = JSON.stringify(contact);
    if (signature !== requestSignature) {
      requestId = window.crypto?.randomUUID ? window.crypto.randomUUID() : 'mm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      requestSignature = signature;
    }
    busy = true;
    submit.disabled = true;
    $('mm-back').disabled = true;
    form.setAttribute('aria-busy','true');
    fields.forEach(name => { $('mm-' + name).readOnly = true; });
    $('mm-submit-label').textContent = 'Invio…';
    $('mm-send-error').hidden = true;
    $('mm-email-fallback').hidden = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),15000);
    try {
      const response = await fetch(endpoint,{
        method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({schemaVersion:1,requestId,contact,source:'memento-contact',website_hp:$('mm-website').value}),
        credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('not accepted');
      form.hidden = true;
      $('mm-result').hidden = false;
      $('mm-result-eyebrow').textContent = 'Il primo passo è fatto.';
      $('mm-result-title').textContent = 'Messaggio inviato.';
      $('mm-result-description').textContent = 'Grazie per averci scritto. Ti rispondiamo via email.';
      $('mm-draft-actions').hidden = true;
      $('mm-draft-details').hidden = true;
      $('mm-edit').hidden = true;
      $('mm-success-mail').hidden = false;
      focusAt($('mm-result-title'));
      announce('Messaggio inviato.');
    } catch {
      $('mm-send-error').textContent = 'Non abbiamo una conferma di invio. Il tuo messaggio è ancora qui: riprova oppure preparalo via email.';
      $('mm-send-error').hidden = false;
      $('mm-email-fallback').hidden = false;
    } finally {
      clearTimeout(timeout);
      busy = false;submit.disabled = false;$('mm-back').disabled = false;
      form.removeAttribute('aria-busy');
      fields.forEach(name => { $('mm-' + name).readOnly = false; });
      $('mm-submit-label').textContent = 'Invia messaggio';
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (busy || !validate()) return;
    if ($('mm-website').value) { $('mm-send-error').textContent = 'Non è stato possibile preparare il messaggio. Scrivici direttamente via email.'; $('mm-send-error').hidden = false; return; }
    if (endpoint) deliver(); else showDraft();
  });


  // Keep a natural page height when the mobile keyboard opens. No scroll lock.
  const messageInput = $('mm-message');
  let layoutFrame = 0;
  function fitMessage() {
    if (form.hidden || $('mm-compose').hidden) return;
    const minimum = parseFloat(getComputedStyle(messageInput).minHeight) || 116;
    const maximum = Math.max(minimum, Math.min(360, (window.visualViewport?.height || window.innerHeight) * .5));
    const previousScroll = messageInput.scrollTop;
    messageInput.style.height = 'auto';
    const desired = messageInput.scrollHeight + 2;
    messageInput.style.height = Math.max(minimum, Math.min(maximum, desired)) + 'px';
    messageInput.style.overflowY = desired > maximum ? 'auto' : 'hidden';
    messageInput.scrollTop = previousScroll;
  }
  function scheduleLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(fitMessage);
  }
  messageInput.addEventListener('input', scheduleLayout);
  window.addEventListener('resize', scheduleLayout, {passive:true});
  window.addEventListener('pageshow', scheduleLayout);
  document.fonts?.ready.then(scheduleLayout);
  window.visualViewport?.addEventListener('resize', () => {
    scheduleLayout();
    const active = document.activeElement;
    if (!root.contains(active) || !active.matches('input,textarea')) return;
    requestAnimationFrame(() => {
      const box = active.getBoundingClientRect();
      const viewport = window.visualViewport;
      if (box.bottom > viewport.offsetTop + viewport.height - 16 || box.top < viewport.offsetTop + 16) {
        active.scrollIntoView({block:'nearest',behavior:'auto'});
      }
    });
  }, {passive:true});
  form.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing || !window.matchMedia('(pointer:coarse)').matches) return;
    const index = fields.slice(0,3).findIndex(name => event.target === $('mm-' + name));
    if (index >= 0) { event.preventDefault(); focusAt($('mm-' + fields[index + 1])); }
  });

  // Height only. No PII, no listeners for incoming messages, no wildcard origin.
  const parentUrl = safeHttps(config.parentOrigin);
  if (window.parent !== window && parentUrl && 'ResizeObserver' in window) {
    let lastHeight = 0, frame = 0;
    const notifyHeight = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(root.getBoundingClientRect().height);
        if (height !== lastHeight) {
          lastHeight = height;
          window.parent.postMessage({type:'memento:contact:resize',height},new URL(parentUrl).origin);
        }
      });
    };
    const observer = new ResizeObserver(notifyHeight);
    observer.observe(root);
    notifyHeight();
    window.addEventListener('pagehide', () => { observer.disconnect(); cancelAnimationFrame(frame); });
    window.addEventListener('pageshow', () => { observer.observe(root); notifyHeight(); });
  }
})();
