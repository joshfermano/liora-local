const { colors, type, radii, spacing } = require('./src/ui/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors,
      fontSize: type,
      borderRadius: radii,
      spacing,
      minHeight: spacing,
      maxWidth: spacing,
      fontFamily: { display: ['Marcellus_400Regular'] },
    },
  },
  plugins: [],
};
