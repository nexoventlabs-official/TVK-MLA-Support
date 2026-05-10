/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-navy/5', 'bg-saffron/5', 'bg-tvk-green/5',
    'border-navy/10', 'border-saffron/10', 'border-tvk-green/10',
    'text-navy', 'text-saffron', 'text-tvk-green',
    'bg-navy', 'bg-saffron', 'bg-tvk-green',
  ],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1a3a6b', dark: '#0d2347', mid: '#1e4a85', light: '#e8edf5' },
        saffron: { DEFAULT: '#f26522', light: '#fff3ec' },
        tvk: { green: '#138808', blue: '#0057a8' }
      },
      fontFamily: {
        sans: ['Noto Sans', 'sans-serif'],
        serif: ['Noto Serif', 'serif'],
      }
    },
  },
  plugins: [],
}
