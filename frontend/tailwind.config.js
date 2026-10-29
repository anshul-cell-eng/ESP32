/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sentinel: {
          // Editorial Cinematic Palette
          deepTeal: '#062E32',
          darkGreen: '#052521',
          navy: '#091326',
          cyan: '#35D7E8',
          cyanGlow: 'rgba(53, 215, 232, 0.25)',
          coral: '#FF746D',
          coralHover: '#E05D57',
          coralGlow: 'rgba(255, 116, 109, 0.25)',
          white: '#F7FAFC',
          mutedText: '#C0D1D4',

          // Surface & Cards (Deep atmospheric teals & slates)
          bg: '#2E2A27',
          surface: '#08252A',
          surfaceLight: '#0C343B',
          panel: '#0B2C33',
          panelHover: '#103942',
          border: 'rgba(192, 209, 212, 0.12)',
          borderSubtle: 'rgba(192, 209, 212, 0.06)',
          borderActive: '#35D7E8',

          // Accents & State
          blue: '#35D7E8',
          blueHover: '#22B8C9',
          safe: '#22C55E',
          safeBg: 'rgba(34, 197, 94, 0.12)',
          warning: '#F59E0B',
          warningBg: 'rgba(245, 158, 11, 0.12)',
          critical: '#FF746D',
          criticalBg: 'rgba(255, 116, 109, 0.15)',
          text: '#F7FAFC',
          textSecondary: '#C0D1D4',
          muted: '#7E9A9E'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(4, 20, 24, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
        'hero': '0 20px 50px -10px rgba(5, 37, 33, 0.7), 0 10px 20px -5px rgba(0, 0, 0, 0.5)',
        'coralGlow': '0 0 35px -5px rgba(255, 116, 109, 0.4)',
        'cyanGlow': '0 0 35px -5px rgba(53, 215, 232, 0.35)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }
    },
  },
  plugins: [],
}
