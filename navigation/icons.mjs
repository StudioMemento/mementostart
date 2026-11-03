const sheet = new URL('./assets/icons-v3.png',import.meta.url).href;
const order = ['memento','services','projects','levelup','start'];
export function iconSVG(id) {
  const index = Math.max(0,order.indexOf(id));
  return `<svg class="mm-symbol" viewBox="${index*434.4} 130 434.4 450" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><image href="${sheet}" x="0" y="0" width="2172" height="724"/></svg>`;
}
