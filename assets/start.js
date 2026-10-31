(() => {
  'use strict';
  const root = document.getElementById('memento-contact');
  const $ = id => document.getElementById(id);
  const config = JSON.parse($('memento-contact-config').textContent);
  const safeHttps = value => {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; }
    catch { return ''; }
  };
  const endpoint = safeHttps(config.endpoint);
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(config.email) ? config.email : 'info@mementostudio.it';
  const responseTime = String(config.responseTime || '').trim().slice(0,100);
  root.querySelectorAll('[data-email-link]').forEach(a => { a.href = 'mailto:' + email; });
  root.querySelectorAll('[data-email-text]').forEach(a => { a.textContent = email; });
  const phone = String(config.phone || '').replace(/[\s().-]/g,'');
  const whatsapp = String(config.whatsapp || '').replace(/\D/g,'');
  if (/^\+\d{7,15}$/.test(phone)) $('mm-phone-link').href = 'tel:' + phone;
  else $('mm-phone-link').hidden = true;
  if (/^\d{7,15}$/.test(whatsapp)) $('mm-whatsapp-link').href = 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(config.whatsappMessage || 'Ciao Memento! Vorrei parlarvi di un’idea.');
  else $('mm-whatsapp-link').hidden = true;
  if (safeHttps(config.privacyUrl)) { $('mm-privacy-link').href = safeHttps(config.privacyUrl); $('mm-privacy').hidden = false; }
  if (endpoint) $('mm-submit-label').textContent = 'Invia messaggio';

  const fields = ['name','email','message'];
  const form = $('mm-form');
  let busy = false, draft = '', requestId = '', requestSignature = '';
  const value = name => $('mm-' + name).value.trim();
  const announce = message => { $('mm-announcement').textContent = message; };
  const focusAt = element => {
    element.focus({preventScroll:true});
    const box = element.getBoundingClientRect();
    if (box.top < 16 || box.bottom > window.innerHeight - 16) element.scrollIntoView({block:'nearest',behavior:'auto'});
  };
  function errorFor(name) {
    const input = $('mm-' + name), text = value(name);
    if (name === 'name' && !text) return 'Come ti chiami?';
    if (name === 'email' && (!text || input.validity.typeMismatch)) return 'Inserisci un indirizzo email valido.';
    if (name === 'message' && !text) return 'Raccontaci cosa hai in mente.';
    return text.length > input.maxLength ? 'Il testo supera il limite del campo.' : '';
  }
  function showError(name, error) {
    const input = $('mm-' + name), note = $('mm-' + name + '-error');
    note.textContent = error; note.hidden = !error;
    if (error) input.setAttribute('aria-invalid','true'); else input.removeAttribute('aria-invalid');
  }
  function validate() {
    let first = '';
    fields.forEach(name => { const error = errorFor(name); showError(name,error); if (error && !first) first = name; });
    if (first) { announce('Controlla i campi indicati.'); focusAt($('mm-' + first)); return false; }
    announce(''); return true;
  }
  fields.forEach(name => {
    const input = $('mm-' + name);
    input.addEventListener('blur', () => { if (value(name) || input.hasAttribute('aria-invalid')) showError(name,errorFor(name)); });
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) showError(name,errorFor(name));
      $('mm-send-error').hidden = true; $('mm-email-fallback').hidden = true;
    });
  });
  function composeDraft() {
    const contact = Object.fromEntries(fields.map(name => [name,value(name)]));
    draft = ['Ciao Memento,','',contact.message,'','—',contact.name,'Email: ' + contact.email].join('\n');
    $('mm-draft').textContent = draft;
    const subject = 'Un nuovo progetto — ' + contact.name.replace(/[\r\n]/g,' ');
    const shortLink = 'mailto:' + email + '?subject=' + encodeURIComponent(subject);
    const fullLink = shortLink + '&body=' + encodeURIComponent(draft);
    const long = fullLink.length > 1800;
    $('mm-open-email').href = long ? shortLink : fullLink;
    $('mm-result-description').textContent = long ? 'Copia il testo completo, poi apri l’email e incollalo.' : 'Aprila nella tua app di posta e completa l’invio.';
    $('mm-draft-details').open = long;
    $('mm-copy-status').textContent = '';
    return contact;
  }
  function showDraft() {
    composeDraft();
    $('mm-result-title').textContent = 'Email pronta.';
    $('mm-draft-actions').hidden = false; $('mm-draft-details').hidden = false;
    form.hidden = true; $('mm-result').hidden = false;
    focusAt($('mm-result-title'));
    announce('Email preparata. Completa l’invio nella tua app di posta.');
  }
  function edit() {
    if (busy) return;
    $('mm-result').hidden = true; form.hidden = false;
    focusAt($('mm-message'));
  }
  $('mm-edit').addEventListener('click',edit);
  document.querySelectorAll('a[href="#mm-message"],a[href="#mm-name"]').forEach(a => a.addEventListener('click',event => {
    event.preventDefault();
    if (busy) return;
    if (form.hidden) { $('mm-result').hidden = true; form.hidden = false; }
    focusAt($(a.getAttribute('href').slice(1)));
  }));
  document.querySelector('.faq-contact').addEventListener('click', event => {
    event.preventDefault();
    // Keep the current draft/result and do not open the mobile keyboard.
    focusAt($('mm-compose'));
  });
  $('mm-copy').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('unavailable');
      await navigator.clipboard.writeText(draft);
      $('mm-copy-status').textContent = 'Testo copiato.';
    } catch {
      $('mm-draft-details').open = true;
      const range = document.createRange(); range.selectNodeContents($('mm-draft'));
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      focusAt($('mm-draft'));
      $('mm-copy-status').textContent = 'Seleziona e copia il testo qui sotto.';
    }
  });
  $('mm-email-fallback').addEventListener('click', () => { if (validate()) showDraft(); });
  async function deliver() {
    const contact = composeDraft(), signature = JSON.stringify(contact);
    if (signature !== requestSignature) {
      requestId = window.crypto?.randomUUID ? window.crypto.randomUUID() : 'mm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      requestSignature = signature;
    }
    busy = true; $('mm-submit').disabled = true; form.setAttribute('aria-busy','true');
    fields.forEach(name => { $('mm-' + name).readOnly = true; });
    $('mm-submit-label').textContent = 'Invio in corso…';
    $('mm-send-error').hidden = true; $('mm-email-fallback').hidden = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),15000);
    try {
      const response = await fetch(endpoint, {
        method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({schemaVersion:1,requestId,contact,source:'memento-contact',website_hp:$('mm-website').value}),
        credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('not accepted');
      form.hidden = true; $('mm-result').hidden = false;
      $('mm-result-title').textContent = 'Messaggio ricevuto.';
      $('mm-result-description').textContent = 'Ora tocca a noi. Ti risponderemo via email' + (responseTime ? ' ' + responseTime : '') + '.';
      $('mm-draft-actions').hidden = true; $('mm-draft-details').hidden = true;
      focusAt($('mm-result-title')); announce('Messaggio ricevuto.');
    } catch {
      $('mm-send-error').textContent = 'Non riusciamo a confermare l’invio. Il testo è ancora qui.';
      $('mm-send-error').hidden = false; $('mm-email-fallback').hidden = false;
    } finally {
      clearTimeout(timeout); busy = false; $('mm-submit').disabled = false; form.removeAttribute('aria-busy');
      fields.forEach(name => { $('mm-' + name).readOnly = false; });
      $('mm-submit-label').textContent = 'Invia messaggio';
    }
  }
  form.addEventListener('submit',event => {
    event.preventDefault();
    if (busy || !validate()) return;
    if ($('mm-website').value) { $('mm-send-error').textContent = 'Scrivici direttamente via email.'; $('mm-send-error').hidden = false; return; }
    if (endpoint) deliver(); else showDraft();
  });
  form.addEventListener('keydown',event => {
    if (event.key !== 'Enter' || event.isComposing || !matchMedia('(pointer:coarse)').matches) return;
    const index = fields.slice(0,2).findIndex(name => event.target === $('mm-' + name));
    if (index >= 0) { event.preventDefault(); focusAt($('mm-' + fields[index+1])); }
  });

  // Keep keyboard focus visible without locking the page or persisting contact data.
  window.visualViewport?.addEventListener('resize',() => {
    const focused = document.activeElement;
    if (form.contains(focused) && focused.matches('input,textarea')) requestAnimationFrame(() => focused.scrollIntoView({block:'nearest',behavior:'auto'}));
  },{passive:true});
  const parentUrl = safeHttps(config.parentOrigin);
  if (window.parent !== window && parentUrl && 'ResizeObserver' in window) {
    let lastHeight = 0;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(root.getBoundingClientRect().height);
      if (height !== lastHeight) { lastHeight = height; window.parent.postMessage({type:'memento:contact:resize',height},new URL(parentUrl).origin); }
    });
    observer.observe(root);
  }
})();
