/** @type {import('tailwindcss').Config} */
//
// Monochrome admin palette — pure white, #fafafa parchment, deep black.
// `brand.*` is intentionally a neutral grayscale ramp so every existing
// page that uses `bg-brand-100`, `text-brand-700`, etc. automatically
// inherits the new clean look without per-component edits. The accent
// scale doubles the same neutrals so any `accent-*` references stay
// visually consistent.
//
// Design intent:
//   brand-50  → page background tone (#fafafa)
//   brand-100 → hairline / hover surface
//   brand-200 → divider / border
//   brand-700 → strong text, primary nav active
//   brand-900 → primary buttons, headings (near-black)
//   brand-950 → deepest black (CTA hover, focus)
//
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#27272a',
          800: '#18181b',
          900: '#0a0a0a',
          950: '#000000',
        },
        accent: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#27272a',
          800: '#18181b',
          900: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.035em',
      },
      boxShadow: {
        // Subtle, low-contrast shadows used on cards. Two stacked layers
        // mimic the "Linear / Vercel" depth that reads as crisp paper
        // rather than a heavy drop shadow.
        sheet: '0 1px 0 rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.03)',
        elevated: '0 1px 0 rgba(0,0,0,.04), 0 8px 24px -12px rgba(0,0,0,.12)',
        focus: '0 0 0 3px rgba(0,0,0,.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.45s cubic-bezier(.2,.8,.2,1)',
        'slide-down': 'slideDown 0.35s cubic-bezier(.2,.8,.2,1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
