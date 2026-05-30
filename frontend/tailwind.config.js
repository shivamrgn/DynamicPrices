/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        carbon: {
          950: '#05070C', // deep liquid glass base
          900: '#0A0D18', // deep secondary backdrop
          850: '#0F1424',
          800: '#131A30', // base input background
          750: '#171F3B',
          700: '#1B2545',
          600: '#24305A',
          500: '#2E3E73',
          400: '#3D5094',
        },
        slate: {
          border: 'rgba(59, 130, 246, 0.16)', // glowing glass border
        },
        acid: {
          DEFAULT: '#00E5FF', // electric cyan
          dim: '#00B4D8',
          muted: 'rgba(0, 229, 255, 0.12)',
        },
        amber: {
          signal: '#FFB300', // glowing amber
          dim: '#E69D00',
          muted: 'rgba(255, 179, 0, 0.12)',
        },
        crimson: {
          signal: '#FF2A5F', // neon magenta
          dim: '#D61A4B',
          muted: 'rgba(255, 42, 95, 0.12)',
        },
        cobalt: {
          signal: '#3B82F6', // electric blue
          dim: '#1D4ED8',
          muted: 'rgba(59, 130, 246, 0.12)',
        },
        // Text
        ink: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          tertiary: '#64748B',
          disabled: '#475569',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace'],
        display: ['"Space Grotesk"', '"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'data-lg': ['1.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'data-md': ['1.125rem', { lineHeight: '1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'data-sm': ['0.875rem', { lineHeight: '1', letterSpacing: '0', fontWeight: '500' }],
        'label': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '500' }],
      },
      boxShadow: {
        'glow-acid': '0 0 24px rgba(0, 229, 255, 0.15)',
        'glow-amber': '0 0 24px rgba(255, 179, 0, 0.15)',
        'glow-crimson': '0 0 24px rgba(255, 42, 95, 0.15)',
        'card': '0 10px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'panel': 'inset 0 1px 0 rgba(255,255,255,0.02)',
      },
      borderColor: {
        DEFAULT: 'rgba(59, 130, 246, 0.16)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ticker': 'ticker 30s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
