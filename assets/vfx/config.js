/* Memento VFX V2 — CSS pixels, one shared field, stable surface topology. */
window.MEMENTO_VFX_CONFIG = Object.freeze({
  enabled: true,
  cursor: { radius:260, touchRadius:130, navRadius:110, follow:70, attack:120, release:380 },
  transition: { intro:1050, interrupt:100, top:[.015,.13], bottom:[.86,1], rootGate:.12,
    cell:26, mobileCell:20, exitGain:.55, particles:48, mobileParticles:20 },
  material: { accent:'#ff7950', edge:'#ffb38b', wire:'#bd734f', glow:1.6, edgeWidth:.65 },
  quality: { maxCachedOwners:8, maxCellsPerOwner:1800, slowFrame:12 }
});
