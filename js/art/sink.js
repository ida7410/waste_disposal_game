// Kitchen sink with tap, drawn in code. The tap sits on the left so the
// `.stream` (shown while pouring) falls from where a tipped container's
// mouth ends up when it's docked over the basin.
const LINE = '#2b3442';
const O = `stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;

export function sinkSvg() {
  return `<svg viewBox="0 0 140 130" aria-hidden="true" focusable="false">
    <path d="M18 64V22a8 8 0 0 1 8-8h12a6 6 0 0 1 6 6v6" fill="none" stroke="#8a96a3" stroke-width="7" stroke-linecap="round"/>
    <rect class="stream" x="80" y="18" width="10" height="76" rx="5" fill="#4ea3ea"/>
    <path d="M10 70h120l-12 50H22z" fill="#d7dee6" ${O}/>
    <path d="M6 64h128v8H6z" fill="#eef2f6" ${O}/>
    <ellipse cx="85" cy="100" rx="9" ry="3.5" fill="#5f6b7a"/>
  </svg>`;
}
