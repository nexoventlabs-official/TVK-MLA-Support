/** @type {import('tailwindcss').Config} */
//
// Government-style palette for the Mylapore constituency admin panel:
//
//   brand (navy blue)   →  headers, primary actions, sidebar
//   accent (gold)       →  emblems, highlights, section borders
//   ivory / parchment   →  subtle warm backgrounds in place of plain white
//
// The `brand.*` ramp is kept on the same scale (50 → 900) as the main
// party admin panel so page components copied verbatim (which use
// `bg-brand-100`, `text-brand-700`, etc.) automatically inherit the
// new government look without any per-component edits.
//
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f5fb',
          100: '#dce6f4',
          200: '#b9cde9',
          300: '#8aaad6',
          400: '#5b85c0',
          500: '#3864a8',
          600: '#264f8f',
          700: '#1d3f75',
          800: '#162f59',
          900: '#0e1f3d',
        },
        accent: {
          50: '#fdf8e8',
          100: '#faedc0',
          200: '#f3dc87',
          300: '#e8c451',
          400: '#d4af37',
          500: '#b8962a',
          600: '#957725',
          700: '#755c1f',
        },
        ivory: {
          50: '#fbfaf6',
          100: '#f6f3ea',
          200: '#ece6d3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        emboss: '0 1px 0 rgba(255,255,255,.8) inset, 0 -1px 0 rgba(0,0,0,.04) inset, 0 8px 24px rgba(14,31,61,.06)',
        'brand-glow': '0 10px 30px -10px rgba(29,63,117,.45)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        shimmer: 'shimmer 2.4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
