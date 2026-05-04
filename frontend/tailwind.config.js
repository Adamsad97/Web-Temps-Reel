/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        body:    ['Calibri', 'Gill Sans', 'Trebuchet MS', 'Liberation Sans', 'Arial', 'sans-serif'],
        display: ['Libre Baskerville', 'Georgia', 'Cambria', 'serif'],
        mono:    ['Courier New', 'monospace'],
      },
      colors: {
        gold: {
          50:  '#fdf8ed',
          100: '#f8ecc8',
          200: '#f0d48a',
          300: '#e5b84e',
          400: '#d4a017',
          500: '#c9a84c',
          600: '#a07830',
          700: '#7c5c22',
          800: '#5a4118',
          900: '#3b2a0e',
        },
        navy: {
          50:  '#eef2fa',
          100: '#d3dcf2',
          200: '#a7b9e5',
          300: '#6b8dd0',
          400: '#3a65b8',
          500: '#1e3f78',
          600: '#162f5a',
          700: '#0d1e3c',
          800: '#081428',
          900: '#040b18',
        },
        cream: '#f7f4ee',
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
        xl: '16px',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(13,30,60,0.08)',
        card: '0 4px 20px rgba(13,30,60,0.10)',
        glow: '0 0 0 3px rgba(201,168,76,0.20)',
      },
    },
  },
  plugins: [],
};
