import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#F7F8FB',
        ink: {
          DEFAULT: '#182033',
          soft: '#3B4459',
          muted: '#8790A3',
          faint: '#B4BAC7',
        },
        line: '#ECEEF3',
        rose: {
          50: '#FFF1F5',
          100: '#FFE3EC',
          200: '#FFC7D8',
          300: '#FF9DBA',
          400: '#FF6A96',
          500: '#FF2D70',
          600: '#E91E61',
          700: '#C41450',
        },
        mint: { 50: '#E9FBF5', 100: '#CFF5E8', 500: '#20C997', 600: '#16A57B' },
        amber: { 50: '#FEF5E9', 100: '#FDE8CB', 500: '#F2A33A', 600: '#D9861B' },
        lilac: { 50: '#F3F2FF', 100: '#E8E6FD', 200: '#D7D3FA', 500: '#7C6FE6' },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        hand: ['Caveat', '"Segoe Script"', 'cursive'],
      },
      borderRadius: {
        card: '20px',
        xl2: '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(24,32,51,0.04), 0 8px 24px -12px rgba(24,32,51,0.10)',
        soft: '0 12px 40px -16px rgba(24,32,51,0.18)',
        pink: '0 10px 24px -10px rgba(255,45,112,0.55)',
        float: '0 24px 60px -20px rgba(24,32,51,0.30)',
      },
      maxWidth: { content: '1500px' },
      keyframes: {
        flash: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,45,112,0)' },
          '30%': { boxShadow: '0 0 0 4px rgba(255,45,112,0.35)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        flash: 'flash 1.6s ease-in-out 2',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
