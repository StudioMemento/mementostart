/* Contatti e collegamenti: modifica solo i valori tra virgolette. Nessuna chiave segreta in questo file. */
export const config = {
  email: 'info@mementostudio.it',
  projectEmail: 'mementoxdesign@gmail.com',
  phone: '+393285454661',
  phoneLabel: '+39 328 545 4661',
  whatsapp: '393285454661',
  whatsappMessage: 'Ciao Memento! Vorrei parlarvi di un progetto.',
  instagramUrl: 'https://www.instagram.com/mementostudio.it/',
  fiverrUrl: 'https://www.fiverr.com/studio_memento',
  // Facoltativi: lasciare vuoti per mostrare i pannelli informativi locali.
  privacyUrl: '',
  cookiePolicyUrl: '',
  legalUrl: '',
  hubUrl: 'https://mementostudio.it/#start',
  mapsUrl:
    'https://www.google.com/maps/place/Studio+Memento/@46.1728195,12.7091736,17z/data=!3m1!4b1!4m6!3m5!1s0x477983c7589f96e3:0xc01de6724c9b8d3d!8m2!3d46.1728195!4d12.7091736!16s%2Fg%2F11xlzkk8fv?entry=ttu&g_ep=EgoyMDI2MTAyOC4wIKXMDSoASAFQAw%3D%3D',
  mapsEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2762.891299543338!2d12.7091736!3d46.172819499999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x477983c7589f96e3%3A0xc01de6724c9b8d3d!2sStudio%20Memento!5e0!3m2!1sen!2sit!4v1793534389295!5m2!1sen!2sit',
  addressLine: 'Piazza Trento 12',
  addressCity: '33085 Maniago (PN)',
} as const;

export const links = {
  projectMail: `mailto:${config.projectEmail}`,
  studioMail: `mailto:${config.email}`,
  phone: `tel:${config.phone}`,
  whatsapp: `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(config.whatsappMessage)}`,
};
