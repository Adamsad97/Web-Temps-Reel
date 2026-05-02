/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Georgia', 'Cambria', 'serif'],
        body: ['Garamond', 'Georgia', 'serif'],
        mono: ['Courier New', 'monospace'],
      },
      colors: {
        gold: {
          50:  '#fdf9ed',
          100: '#f9efcc',
          200: '#f2da8a',
          300: '#e8c04e',
          400: '#d4a017',
          500: '#b8860b',
          600: '#9a6e09',
          700: '#7a5507',
          800: '#5c3f05',
          900: '#3d2a03',
        },
        navy: {
          50:  '#eef2f9',
          100: '#d4dff0',
          200: '#a9bfe0',
          300: '#6e8fc5',
          400: '#3d65a8',
          500: '#1d3d7a',
          600: '#152d5c',
          700: '#0e1f40',
          800: '#091428',
          900: '#040c18',
        },
        cream: '#f8f5ef',
      },
    },
  },
  plugins: [],
};
