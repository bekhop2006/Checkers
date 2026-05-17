/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        ink2: 'rgb(var(--ink-2) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        brand2: 'rgb(var(--brand-2) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
        boardLight: 'rgb(var(--board-light) / <alpha-value>)',
        boardDark: 'rgb(var(--board-dark) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--brand) / .4), 0 8px 24px -8px rgb(var(--brand) / .35)',
        card: '0 1px 0 rgb(255 255 255 / 5%) inset, 0 12px 32px -12px rgb(0 0 0 / 35%)',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slidein: {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--brand) / .55)' },
          '50%': { boxShadow: '0 0 0 8px rgb(var(--brand) / 0)' },
        },
      },
      animation: {
        pop: 'pop 240ms cubic-bezier(.2,.8,.2,1.2) both',
        slidein: 'slidein 220ms ease-out both',
        glow: 'glow 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
}
