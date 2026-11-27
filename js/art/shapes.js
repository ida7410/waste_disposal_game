// Simple item shapes on a 120x120 canvas. Each takes a main colour.
// Plain geometry only: no logos, characters or copied images.

const LINE = '#2b3442';
const O = `stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;

export const SHAPES = {
  bottle: (c) => `<rect x="51" y="12" width="18" height="9" rx="2" fill="#5a6b7d" ${O}/>
    <path d="M53 21h14v10c11 5 15 11 15 20v52a5 5 0 0 1-5 5H43a5 5 0 0 1-5-5V51c0-9 4-15 15-20z" fill="${c}" ${O}/>
    <rect x="38" y="58" width="44" height="18" fill="#fff" opacity=".6"/>`,
  wine: (c) => `<path d="M54 10h12v28c10 5 14 12 14 22v46a4 4 0 0 1-4 4H44a4 4 0 0 1-4-4V60c0-10 4-17 14-22z" fill="${c}" ${O}/>
    <rect x="42" y="66" width="36" height="22" rx="2" fill="#f3ead2" ${O}/>`,
  can: (c) => `<rect x="38" y="22" width="44" height="80" rx="7" fill="${c}" ${O}/>
    <ellipse cx="60" cy="24" rx="22" ry="5" fill="#cfd5dc" ${O}/>
    <path d="M38 50h44M38 78h44" stroke="#fff" stroke-width="5" opacity=".5"/>`,
  jar: (c) => `<rect x="42" y="18" width="36" height="12" rx="3" fill="#8a96a3" ${O}/>
    <rect x="34" y="30" width="52" height="74" rx="10" fill="${c}" ${O}/>
    <path d="M38 76c10-6 34-6 44 0v20H38z" fill="#c0392b" opacity=".75"/>`,
  box: (c) => `<path d="M34 18h52v86H34z" fill="${c}" ${O}/>
    <path d="M34 18l8-6h52l-8 6M86 18l8-6v86l-8 6" fill="#e8d2a0" ${O}/>
    <circle cx="60" cy="56" r="14" fill="#fff" opacity=".7"/>`,
  carton: (c) => `<path d="M38 36l10-20h24l10 20v68H38z" fill="${c}" ${O}/>
    <path d="M48 16h24v-4H48zM38 36h44" fill="none" ${O}/>
    <rect x="44" y="56" width="32" height="26" rx="4" fill="#5b8fd9" opacity=".7"/>`,
  paper: (c) => `<rect x="28" y="22" width="64" height="80" rx="3" fill="${c}" ${O}/>
    <path d="M38 38h44M38 50h44M38 62h30M38 74h44M38 86h24" stroke="#8994a3" stroke-width="4" stroke-linecap="round"/>`,
  peel: (c) => `<path d="M60 30c-6 20-20 40-34 58 14 2 28-6 34-20 6 14 20 22 34 20C80 70 66 50 60 30z" fill="${c}" ${O}/>
    <path d="M57 30l3-12 3 12" fill="#6b4f2a" ${O}/>`,
  blob: (c) => `<path d="M30 70c-8-22 10-44 30-40 22-6 38 16 30 40-6 18-20 26-30 26S36 88 30 70z" fill="${c}" ${O}/>
    <path d="M60 30c0-8 4-14 10-16" fill="none" ${O}/>`,
  shells: (c) => `<path d="M24 76c0-20 12-36 26-36 4 0 8 2 10 6l-6 8 8 6-8 8 6 8H24z" fill="${c}" ${O}/>
    <path d="M96 66c0 20-12 30-26 30-6 0-10-2-12-6l6-6-8-6 8-8-6-8c4-4 8-6 12-6 14 0 26 4 26 10z" fill="${c}" ${O}/>`,
  bone: (c) => `<path d="M30 40a9 9 0 1 1 12-8l40 40a9 9 0 1 1 8 12 9 9 0 1 1-12 8L38 52a9 9 0 1 1-8-12z" fill="${c}" ${O}/>`,
  cup: (c) => `<path d="M34 28h52l-7 76H41z" fill="${c}" ${O}/>
    <rect x="30" y="20" width="60" height="10" rx="3" fill="#f2f2f2" ${O}/>
    <path d="M38 52h44l-2 22H40z" fill="#7a5134" opacity=".8"/>`,
  mug: (c) => `<path d="M30 34h50v54a12 12 0 0 1-12 12H42a12 12 0 0 1-12-12z" fill="${c}" ${O}/>
    <path d="M80 46h8a10 10 0 0 1 0 22h-8" fill="none" stroke="${LINE}" stroke-width="5"/>
    <path d="M52 34l6 18-8 10 6 14" fill="none" stroke="${LINE}" stroke-width="2.5"/>`,
  tumbler: (c) => `<path d="M34 24h52l-6 80H40z" fill="${c}" fill-opacity=".55" ${O}/>
    <path d="M60 24l-4 22 10 12-6 18" fill="none" stroke="${LINE}" stroke-width="2.5"/>`,
  crinkle: (c) => `<path d="M32 22l6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6v76l-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6z" fill="${c}" ${O}/>
    <ellipse cx="60" cy="62" rx="16" ry="12" fill="#ffd34d" ${O}/>`,
  sack: (c) => `<path d="M30 40h60l-6 64H36z" fill="${c}" ${O}/>
    <path d="M40 40c0-18 12-24 12-8M80 40c0-18-12-24-12-8" fill="none" stroke="${LINE}" stroke-width="3"/>`,
  tube: (c) => `<path d="M42 16h36l-4 70H46z" fill="${c}" ${O}/>
    <path d="M42 16h36" stroke="${LINE}" stroke-width="6"/>
    <rect x="52" y="86" width="16" height="16" rx="3" fill="#e4e8ec" ${O}/>`,
  tray: (c) => `<path d="M18 60h84l-10 34H28z" fill="${c}" ${O}/>
    <path d="M22 60l12-28h52l12 28" fill="${c}" ${O}/>
    <circle cx="46" cy="72" r="6" fill="#c76b2e"/><circle cx="66" cy="76" r="5" fill="#c76b2e"/>`,
  tissue: (c) => `<path d="M30 46c10-10 24 4 30-6s22-6 30 6c8 12-4 18 2 30s-8 22-22 16-18 6-30-2-14-12-10-24-8-12 0-20z" fill="${c}" ${O}/>`,
  pizzabox: (c) => `<path d="M14 54l46-20 46 20-46 20z" fill="${c}" ${O}/>
    <path d="M14 54v18l46 20 46-20V54" fill="${c}" ${O}/>
    <ellipse cx="50" cy="54" rx="9" ry="4" fill="#b98a3e" opacity=".7"/><ellipse cx="72" cy="58" rx="6" ry="3" fill="#b98a3e" opacity=".7"/>`,
  pack: (c) => `<rect x="20" y="40" width="80" height="50" rx="12" fill="${c}" ${O}/>
    <rect x="44" y="48" width="32" height="12" rx="6" fill="#ffffff" ${O}/>`,
  mask: (c) => `<path d="M30 46c20-8 40-8 60 0v24c-20 14-40 14-60 0z" fill="${c}" ${O}/>
    <path d="M30 50c-12 0-14 18 0 18M90 50c12 0 14 18 0 18M36 56h48M36 64h48" fill="none" stroke="${LINE}" stroke-width="2"/>`,
  shirt: (c) => `<path d="M42 20l-24 14 8 18 10-4v54h48V48l10 4 8-18-24-14c-2 8-8 12-18 12s-16-4-18-12z" fill="${c}" ${O}/>`,
  toy: (c) => `<rect x="24" y="52" width="72" height="40" rx="4" fill="${c}" ${O}/>
    <rect x="30" y="40" width="16" height="12" rx="3" fill="${c}" ${O}/><rect x="52" y="40" width="16" height="12" rx="3" fill="${c}" ${O}/><rect x="74" y="40" width="16" height="12" rx="3" fill="${c}" ${O}/>`,
  sticks: (c) => `<path d="M36 104L58 14l6 1-18 90zM56 106l26-90 6 2-22 89z" fill="${c}" ${O}/>`,
  hair: (c) => `<path d="M24 70c10-20 20 10 30-10s20 14 30-6 14 4 14 4M24 84c12-14 20 8 32-8s20 12 30-4 12 2 12 2M30 56c10-12 18 6 28-6s18 8 26-4" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
  towel: (c) => `<path d="M28 34c12-6 24 4 32-2s20-4 32 2v56c-12-6-22 4-32 2s-20-6-32-2z" fill="${c}" ${O}/>
    <circle cx="48" cy="56" r="4" fill="#4aa3df"/><circle cx="66" cy="66" r="3" fill="#4aa3df"/><circle cx="58" cy="76" r="4" fill="#4aa3df"/>`,
  batteries: (c) => `<rect x="30" y="30" width="22" height="66" rx="4" fill="${c}" ${O}/><rect x="36" y="24" width="10" height="6" fill="#bfc6ce" ${O}/>
    <rect x="66" y="30" width="22" height="66" rx="4" fill="${c}" ${O}/><rect x="72" y="24" width="10" height="6" fill="#bfc6ce" ${O}/>
    <path d="M41 46v12M35 52h12M77 46v12M71 52h12" stroke="#fff" stroke-width="3"/>`,
  cell: (c) => `<rect x="24" y="32" width="72" height="56" rx="6" fill="${c}" ${O}/>
    <rect x="34" y="26" width="10" height="6" fill="#d9b44a" ${O}/><rect x="76" y="26" width="10" height="6" fill="#d9b44a" ${O}/>
    <path d="M64 44l-10 16h12l-10 16" fill="none" stroke="#fff" stroke-width="4"/>`,
  charger: (c) => `<rect x="30" y="24" width="32" height="38" rx="6" fill="${c}" ${O}/>
    <path d="M38 24V12M54 24V12" stroke="${LINE}" stroke-width="4"/>
    <path d="M46 62c0 22 40 10 40 34v8" fill="none" stroke="${LINE}" stroke-width="4"/>`,
  paintcan: (c) => `<rect x="28" y="36" width="64" height="66" rx="5" fill="#b8c0c8" ${O}/>
    <path d="M28 36c4-10 60-10 64 0" fill="none" ${O}/><path d="M28 52h64v24c-8 0-8 10-16 10s-8-10-16-10-8 8-16 8-8-8-16-8z" fill="${c}"/>`,
  needle: (c) => `<rect x="36" y="44" width="50" height="18" rx="3" fill="${c}" ${O}/>
    <path d="M86 53h24M20 53h16M20 44v18M14 53h6" stroke="${LINE}" stroke-width="3"/>`,
  pills: (c) => `<rect x="38" y="20" width="44" height="14" rx="3" fill="#ffffff" ${O}/>
    <rect x="34" y="34" width="52" height="68" rx="6" fill="${c}" fill-opacity=".85" ${O}/>
    <rect x="42" y="52" width="36" height="26" rx="3" fill="#fff" ${O}/>`,
  cylinder: (c) => `<rect x="34" y="34" width="52" height="70" rx="22" fill="${c}" ${O}/>
    <rect x="52" y="18" width="16" height="16" rx="3" fill="#8a96a3" ${O}/>`,
  bulb: (c) => `<path d="M40 22v54M56 22v54M72 22v54M40 22h16M56 76h16M72 22h8" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
    <rect x="38" y="80" width="44" height="24" rx="5" fill="#e4e8ec" ${O}/>`,
  spray: (c) => `<rect x="38" y="34" width="44" height="72" rx="6" fill="${c}" ${O}/>
    <path d="M44 34c0-10 32-10 32 0" fill="#d0d6dc" ${O}/><rect x="54" y="16" width="12" height="10" rx="2" fill="#8a96a3" ${O}/>
    <rect x="38" y="56" width="44" height="8" fill="#ffffff" opacity=".55"/>`,
  generic: (c) => `<rect x="28" y="28" width="64" height="64" rx="12" fill="${c}" ${O}/>`,
};
