// Capiz Light tokens from DESIGN.md. Tailwind reads this file; so does the SVG code.
const pairs = {
  tint: ['#C2255C', '#FF7BA7'],
  'tint-fill': ['#C2255C', '#C2255C'],
  'on-tint': ['#FFFFFF', '#FFFFFF'],
  'tint-soft': ['#FBE4EE', '#3A1728'],
  'tint-soft-ink': ['#A11E4E', '#FFB4CC'],
  fertile: ['#127A66', '#52C9A8'],
  'fertile-soft': ['#E1F1EC', '#12302A'],
  'on-fertile': ['#FFFFFF', '#0B2A23'],
  urgent: ['#C8102E', '#FF6B63'],
  'urgent-fill': ['#C8102E', '#C8102E'],
  'on-urgent': ['#FFFFFF', '#FFFFFF'],
  dusk: ['#743C62', '#C99AB4'],
  ground: ['#F2ECF1', '#0F0A0E'],
  surface: ['#FEFBFD', '#1D1519'],
  'surface-raised': ['#FFFFFF', '#271D23'],
  fill: ['#EEE5EC', '#2B2027'],
  label: ['#241A21', '#F8EEF3'],
  'label-secondary': ['#675663', '#B6A5B0'],
  'label-tertiary': ['#9A8996', '#7D6C77'],
  separator: ['#E4D7E0', '#33262E'],
  nacre: ['#D9CAD4', '#3D2E37'],
  frame: ['#7A5640', '#D2AE92'],
  lit: ['#F6E3B8', '#F1D79A'],
  peach: ['#F5C6A5', '#E8A77F'],
  pearl: ['#FBF8FA', '#2E242B'],
  'light-dawn-source': ['#F2CFD4', '#5E2638'],
  'light-dawn-fade': ['#F6DEC4', '#3E2616'],
};

const palette = { light: {}, dark: {} };
const colors = {};
for (const [name, [light, dark]] of Object.entries(pairs)) {
  palette.light[name] = light;
  palette.dark[name] = dark;
  colors[name] = light;
  colors[`${name}-dark`] = dark;
}

const bold = '700';
const type = {
  wordmark: ['22px', { lineHeight: '28px', letterSpacing: '0.6px' }],
  'display-title': ['31px', { lineHeight: '38px', letterSpacing: '-0.3px' }],
  'display-heading': ['23px', { lineHeight: '29px', letterSpacing: '-0.1px' }],
  display: ['44px', { lineHeight: '48px', fontWeight: bold }],
  title1: ['28px', { lineHeight: '34px', fontWeight: bold }],
  title2: ['22px', { lineHeight: '28px', fontWeight: bold }],
  title3: ['20px', { lineHeight: '25px', fontWeight: '600' }],
  headline: ['17px', { lineHeight: '22px', fontWeight: '600' }],
  body: ['17px', { lineHeight: '22px', fontWeight: '400' }],
  subheadline: ['15px', { lineHeight: '20px', fontWeight: '400' }],
  footnote: ['13px', { lineHeight: '18px', fontWeight: '400' }],
  caption1: ['12px', { lineHeight: '16px', fontWeight: '400' }],
};

const radii = { mark: '3px', sm: '10px', pane: '22px', sheet: '28px', capsule: '25px', full: '9999px' };
const spacing = {
  xxs: '4px', xs: '8px', sm: '12px', md: '16px', lg: '20px', xl: '24px', xxl: '32px',
  tap: '44px', capsule: '50px', choice: '56px', field: '132px', fieldmax: '208px', mic: '56px', column: '440px',
};

module.exports = { palette, colors, type, radii, spacing };
