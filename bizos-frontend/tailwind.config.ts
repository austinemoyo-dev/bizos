import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        ui: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        bg: {
          base: '#080E08',
          surface: '#0D1A0D',
          elevated: '#132013',
          overlay: '#1A2D1A',
        },
        border: {
          subtle: '#1A2D1A',
          default: '#243824',
          strong: '#325032',
        },
        accent: {
          primary: '#8B0018',
          gold: '#D4A535',
          green: '#22C55E',
          red: '#EF4444',
          amber: '#F59E0B',
          purple: '#A78BFA',
        },
        text: {
          primary: '#E8F0E8',
          secondary: '#7A9A7A',
          muted: '#3D5C3D',
        },
      },
    },
  },
  plugins: [],
};

export default config;
