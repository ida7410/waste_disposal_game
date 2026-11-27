// Bin icons as inline SVG, drawn in code. Keyed by bin id so each bin has a
// shape as well as a colour. Unknown bins (e.g. from a partner feed) get a
// generic icon; their label is always shown next to it.

const ICONS = {
  // Circular arrows: recycling.
  // Two chasing arrows around a circle: recycling.
  blue: `<path d="M12.2 17.5A13.5 13.5 0 0 1 33.5 13" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
         <path d="M38.5 7.5l-1 12-10.5-4z" fill="currentColor"/>
         <path d="M35.8 30.5A13.5 13.5 0 0 1 14.5 35" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
         <path d="M9.5 40.5l1-12 10.5 4z" fill="currentColor"/>`,
  // Leaf: organics.
  green: `<path d="M10 38C9 21 20 10 39 9c1 19-10 30-27 29z" fill="currentColor"/>
          <path d="M12 36L29 19" stroke="var(--bin-color)" stroke-width="3" stroke-linecap="round"/>`,
  // Trash can.
  garbage: `<rect x="10" y="11" width="28" height="4.5" rx="1.5" fill="currentColor"/>
            <rect x="19" y="6" width="10" height="5" rx="1.5" fill="currentColor"/>
            <path d="M13 18h22l-2.2 22H15.2z" fill="currentColor"/>`,
  // Warning triangle.
  special: `<path d="M24 6l19 33H5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <rect x="21.75" y="16" width="4.5" height="12" rx="1.5" fill="var(--bin-color)"/>
            <circle cx="24" cy="33" r="2.6" fill="var(--bin-color)"/>`,
  // Coin with a cent sign: return for deposit.
  deposit: `<circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="4"/>
            <text x="24" y="31.5" text-anchor="middle" font-size="22" font-weight="700" font-family="system-ui, sans-serif" fill="currentColor">¢</text>`,
};

const GENERIC = `<rect x="11" y="11" width="26" height="26" rx="5" fill="none" stroke="currentColor" stroke-width="4"/>`;

export function binIconSvg(binId) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ICONS[binId] ?? GENERIC}</svg>`;
}
