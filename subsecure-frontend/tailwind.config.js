/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50:'#f4f6fb',100:'#e6eaf5',700:'#1e2a4a',800:'#16203a',900:'#0f1830' },
        brand: { 50:'#f3f0ff',100:'#e5deff',500:'#7c5cfc',600:'#6a48f0',700:'#5b3ad6' },
      },
      boxShadow: { card: '0 1px 2px rgba(15,24,48,.06), 0 4px 16px rgba(15,24,48,.06)' },
    },
  },
  plugins: [],
}
