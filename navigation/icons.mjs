import { iconAssets } from './icon-assets.mjs?v=12.0.0';
import { mementoPaths } from './memento-paths.mjs?v=12.0.0';
let iconSequence=0;
export function iconSVG(id) {
  if(id==='memento'){
    const key='mm-metal-'+(++iconSequence);
    return `<svg class="mm-symbol mm-symbol--memento" viewBox="26.474 41.273 166.741 166.741" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="${key}-shape">${mementoPaths.replace(/<\/?g>/g,'')}</clipPath>
        <linearGradient id="${key}-silver" gradientUnits="userSpaceOnUse" x1="49" y1="54" x2="169" y2="190"><stop stop-color="#ffffff"/><stop offset=".24" stop-color="#d2d9dd"/><stop offset=".49" stop-color="#828b93"/><stop offset=".67" stop-color="#f2f4f5"/><stop offset="1" stop-color="#b8c1c8"/></linearGradient>
        <linearGradient id="${key}-dark" gradientUnits="userSpaceOnUse" x1="65" y1="65" x2="160" y2="180"><stop stop-color="#687078"/><stop offset=".36" stop-color="#2b333b"/><stop offset=".76" stop-color="#48535e"/><stop offset="1" stop-color="#aeb7be"/></linearGradient>
        <linearGradient id="${key}-edge" gradientUnits="userSpaceOnUse" x1="54" y1="54" x2="158" y2="188"><stop stop-color="#fff"/><stop offset=".4" stop-color="#a4acb3"/><stop offset=".7" stop-color="#f0f1f1"/><stop offset="1" stop-color="#7a858d"/></linearGradient>
        <radialGradient id="${key}-light" cx="50%" cy="110%" r="100%"><stop offset="0" stop-color="#ffd28c"/><stop offset=".3" stop-color="#ff9a46"/><stop offset=".58" stop-color="#ff7950" stop-opacity=".65"/><stop offset=".88" stop-color="#ff7950" stop-opacity="0"/></radialGradient>
      </defs>
      <g fill="url(#${key}-dark)">${mementoPaths}</g>
      <g clip-path="url(#${key}-shape)">
        <g fill="url(#${key}-silver)">
          <polygon points="49.61,49.61 106.3,106.3 96.4,106.3 56.69,66.62"/>
          <polygon points="49.61,49.61 56.69,66.62 56.69,155.91 49.61,163"/>
          <polygon points="49.61,170.08 170.08,49.61 161.57,66.27 56.7,180.71"/>
          <polygon points="170.08,77.95 170.08,191.34 162.99,174.33 162.99,95"/>
          <polygon points="113.39,134.64 124.02,134.64 162.99,174.33 170.08,191.34"/>
        </g>
        <g fill="url(#${key}-dark)">
          <polygon points="56.69,66.62 96.4,106.3 95.67,116.93 63.78,85.04"/>
          <polygon points="56.7,180.71 161.57,66.27 170.08,70.87 49.61,191.34"/>
          <polygon points="124.02,124.01 155.91,155.91 162.99,174.33 124.02,134.64"/>
        </g>
        <g fill="none" stroke="url(#${key}-edge)" stroke-width="2" stroke-linejoin="miter">
          ${mementoPaths}
          <path d="M56.69 66.62V155.91M56.7 180.71 161.57 66.27M162.99 95V174.33L124.02 134.64"/>
        </g>
      </g>
      <g class="mm-memento-light" fill="url(#${key}-light)">${mementoPaths}</g>
    </svg>`;
  }
  const asset=iconAssets[id];
  if(!asset)throw new TypeError('Unknown Memento icon: '+id);
  return `<svg class="mm-symbol mm-symbol--${id}" style="--mm-icon-gain:${asset.gain||1}" viewBox="${asset.viewBox}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><image href="${asset.src}" x="0" y="0" width="${asset.width}" height="${asset.height}"/></svg>`;
}
