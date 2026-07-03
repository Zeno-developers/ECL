/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm light palette — to retheme the entire dashboard, edit the
        // CSS variable values in src/styles/globals.css :root { ... }
        warm: {
          charcoal: 'rgb(var(--warm-charcoal) / <alpha-value>)',
          espresso: 'rgb(var(--warm-espresso) / <alpha-value>)',
          plum:     'rgb(var(--warm-plum) / <alpha-value>)',
          muted:    'rgb(var(--warm-muted) / <alpha-value>)',
          gold:     'rgb(var(--warm-gold) / <alpha-value>)',
          ivory:    'rgb(var(--warm-ivory) / <alpha-value>)',
        },
        // Legacy tokens kept for public/marketing pages
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        brand: {
          purple: '#6d28d9',
          gold: '#d4af37',
          'gold-dark': '#b8941f',
        },
        secondary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d4af37',
          600: '#b8941f',
          700: '#8a6f17',
        },
      },
    },
  },
  plugins: [],
}
