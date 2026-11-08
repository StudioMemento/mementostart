(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.MEMENTO_CONFIG || {};
  const safeHttps = value => { try { const u = new URL(value, location.href); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; } };
  const validEmail = value => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
  const email = validEmail(config.email) ? config.email : 'info@mementostudio.it';
  const projectEmail = validEmail(config.projectEmail) ? config.projectEmail : 'mementoxdesign@gmail.com';
  const phone = String(config.phone || '+393285454661').replace(/[\s().-]/g,'');
  const whatsapp = String(config.whatsapp || '393285454661').replace(/\D/g,'');
  const whatsappLink = 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(config.whatsappMessage || 'Ciao Memento! Vorrei parlarvi di un progetto.');
  if (/^\+\d{7,15}$/.test(phone)) $('mm-phone-link').href = 'tel:' + phone;
  if (/^\d{7,15}$/.test(whatsapp)) $('mm-whatsapp-link').href = whatsappLink;
  if (config.phoneLabel) {
    document.querySelector('[data-phone-label]').textContent = config.phoneLabel;
    $('mm-phone-link').setAttribute('aria-label','Chiama '+config.phoneLabel);
  }
  document.querySelectorAll('[data-email-link]').forEach(a => { a.href = 'mailto:' + email; a.textContent = email; });
  [['mm-email-project', projectEmail], ['mm-email-studio', email]].forEach(([id, address]) => {
    const card=$(id); card.href='mailto:'+address; card.setAttribute('aria-label','Scrivi a '+address); card.querySelector('.email-address').textContent=address;
  });
  if (safeHttps(config.hubUrl)) $('mm-explore').href = safeHttps(config.hubUrl);
  if (safeHttps(config.fiverrUrl)) $('mm-fiverr-link').href = safeHttps(config.fiverrUrl);

  const dialog = $('mm-dialog');
  let dialogOpener = null;
  function closeDialog() { dialog.close(); document.body.classList.remove('modal-open'); dialogOpener?.focus({preventScroll:true}); }
  function showDialog(title, build) {
    dialogOpener = document.activeElement;
    $('mm-dialog-title').textContent = title;
    $('mm-dialog-body').replaceChildren();
    build($('mm-dialog-body'));
    document.body.classList.add('modal-open');
    dialog.showModal();
    $('mm-dialog-title').focus({preventScroll:true});
  }
  const paragraph = (root, text) => { const p = document.createElement('p'); p.textContent = text; root.append(p); return p; };
  function contactAction(root, subject) { const a = document.createElement('a'); a.className='action cut-frame'; a.textContent=email; a.href='mailto:'+email+'?subject='+encodeURIComponent(subject); root.append(a); }
  $('mm-dialog-close').addEventListener('click',closeDialog);
  dialog.addEventListener('cancel',event => { event.preventDefault(); closeDialog(); });
  let outsideStart = false;
  dialog.addEventListener('pointerdown',event => { outsideStart = event.target === dialog; });
  dialog.addEventListener('click',event => { if (outsideStart && event.target === dialog) closeDialog(); outsideStart=false; });
  dialog.addEventListener('close',() => document.body.classList.remove('modal-open'));
  $('mm-instagram-link').href = safeHttps(config.instagramUrl) || 'https://www.instagram.com/mementostudio.it/';

  // Embedded map; native lazy loading defers offscreen work. Preferences apply to this visit.
  // Keep hover feedback stable when the pointer crosses into Google's document.
  const mapArea=$('mm-map-area');
  const mapFrame=$('mm-map-frame');
  const setMapHover=active=>mapArea.classList.toggle('is-interacting',active);
  mapArea.addEventListener('mouseenter',()=>setMapHover(true));
  mapArea.addEventListener('mouseleave',()=>setMapHover(false));
  mapFrame.addEventListener('mouseenter',()=>setMapHover(true));
  mapFrame.addEventListener('mouseleave',()=>setMapHover(false));
  let mapEnabled = true;
  $('mm-map-link').href=safeHttps(config.mapsUrl) || $('mm-map-link').href;
  const mapSrc=safeHttps(config.mapsEmbedUrl) || $('mm-map-frame').querySelector('iframe').src;
  function setMap(enabled) {
    mapEnabled=enabled;
    $('mm-map-intro').hidden=enabled; $('mm-map-frame').hidden=!enabled;
    if (!enabled) { $('mm-map-frame').replaceChildren(); return; }
    const existing=$('mm-map-frame').querySelector('iframe');
    if(existing){if(existing.getAttribute('src')!==mapSrc)existing.src=mapSrc;return;}
    const frame=document.createElement('iframe');
    frame.title='Google Maps — Studio Memento, Maniago';
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.loading='lazy'; frame.allowFullscreen=true;
    frame.src=mapSrc;
    $('mm-map-frame').append(frame);
  }
  $('mm-load-map').addEventListener('click',()=>setMap(true));
  setMap(true);
  document.querySelectorAll('[data-policy]').forEach(button => button.addEventListener('click',() => {
    const kind=button.dataset.policy;
    const destination=kind==='privacy'?safeHttps(config.privacyUrl):kind==='cookies'?safeHttps(config.cookiePolicyUrl):kind==='studio'?safeHttps(config.legalUrl):'';
    if (destination) { window.open(destination,'_blank','noopener,noreferrer'); return; }
    if (kind==='privacy') showDialog('Privacy policy',body=>{
      paragraph(body,'Richiedi l’informativa privacy completa di Memento Design Studio.');
      contactAction(body,'Richiesta informativa privacy');
    });
    if (kind==='cookies') showDialog('Cookie & contenuti',body=>{
      paragraph(body,'I collegamenti email aprono la tua app di posta. Questa pagina non raccoglie messaggi tramite un modulo.');
      paragraph(body,'Google Maps è un servizio esterno incorporato nella pagina e può usare cookie propri. Puoi disattivare la mappa dalle preferenze.');
      contactAction(body,'Richiesta cookie policy completa');
    });
    if (kind==='preferences') showDialog('Le tue preferenze',body=>{
      paragraph(body,'Scegli se caricare Google Maps in questa pagina. La scelta vale per questa visita.');
      const row=document.createElement('label');row.className='preference-row';
      const label=document.createElement('span');label.textContent='Google Maps';
      const input=document.createElement('input');input.type='checkbox';input.checked=mapEnabled;input.addEventListener('change',()=>setMap(input.checked));
      row.append(label,input);body.append(row);
    });
    if (kind==='studio') showDialog('Memento Design Studio',body=>{
      paragraph(body,'Piazza Trento 12 · 33085 Maniago (PN)');
      paragraph(body,config.phoneLabel || '+39 328 545 4661');
      contactAction(body,'Informazioni su Memento Design Studio');
    });
  }));

  // One native accordion panel. Click, tap and keyboard share the same state.
  const questions=[...document.querySelectorAll('.faq-item')];
  function syncFaq(){const active=questions.find(item=>item.open);document.querySelectorAll('[data-faq-image]').forEach(img=>img.classList.toggle('is-active',img.dataset.faqImage===(active?.dataset.faq||'idea')));}
  questions.forEach((item,index)=>{
    item.addEventListener('toggle',()=>{if(item.open)questions.forEach(other=>{if(other!==item)other.open=false;});syncFaq();});
    item.querySelector('summary').addEventListener('keydown',event=>{
      if(event.key==='Escape'){item.open=false;event.preventDefault();event.stopPropagation();}
      const target=event.key==='ArrowDown'?(index+1)%questions.length:event.key==='ArrowUp'?(index-1+questions.length)%questions.length:event.key==='Home'?0:event.key==='End'?questions.length-1:null;
      if(target!==null){event.preventDefault();event.stopPropagation();questions[target].querySelector('summary').focus({preventScroll:true});}
    });
  });
  syncFaq();

})();
