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
          base: '#0A0C10',
          surface: '#111318',
          elevated: '#181C24',
          overlay: '#1E2330',
        },
        border: {
          subtle: '#1F2535',
          default: '#2A3347',
          strong: '#3D4F6B',
        },
        accent: {
          primary: '#C8102E',
          gold: '#D4A535',
          green: '#10B981',
          red: '#EF4444',
          amber: '#F59E0B',
          purple: '#8B5CF6',
        },
        text: {
          primary: '#E8EDF5',
          secondary: '#8B96A8',
          muted: '#4A5568',
        },
      },
    },
  },
  plugins: [],
};

export default config;
