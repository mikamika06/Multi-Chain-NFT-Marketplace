import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4D5DFF',
          foreground: '#ffffff',
        },
        background: '#0B0D17',
        card: '#14172B',
      },
    },
  },
  plugins: [],
};

export default config;
