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
          // Coordinated Refined Palette
          bg: '#2E2A27',              // Main page background (warm charcoal)
          panel: '#183638',           // Primary cards
          panelHover: '#204345',      // Elevated cards
          surface: '#263B3C',         // Secondary card surfaces
          surfaceLight: '#2F4B4D',
          border: '#3A5553',          // Card borders
          borderSubtle: 'rgba(58, 85, 83, 0.45)',
          borderActive: '#45D9E6',

          // Typography Contrast
          text: '#F5F5F0',            // Primary text
          white: '#F5F5F0',
          textSecondary: '#B8C5C2',   // Secondary text
          mutedText: '#B8C5C2',
          muted: '#899F9B',           // Muted labels

          // Accents & Safety States
          cyan: '#45D9E6',            // Cyan accent
          blue: '#45D9E6',
          blueHover: '#38C2CE',
          cyanGlow: 'rgba(69, 217, 230, 0.2)',
          safe: '#32C98A',            // Safe green
          safeBg: 'rgba(50, 201, 138, 0.12)',
          warning: '#F3B64B',         // Warning amber
          warningBg: 'rgba(243, 182, 75, 0.12)',
          critical: '#FF6868',        // Critical red
          criticalBg: 'rgba(255, 104, 104, 0.15)',

          // Legacy Aliases
          coral: '#FF6868',
          coralHover: '#E85B5B',
          deepTeal: '#183638',
          darkGreen: '#142E30',
          navy: '#204345'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        'card': '0 4px 16px -2px rgba(18, 28, 28, 0.45), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
        'hero': '0 16px 40px -8px rgba(18, 28, 28, 0.6), 0 4px 12px -2px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 24px -4px rgba(18, 28, 28, 0.55), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
        'cyanGlow': '0 0 25px -4px rgba(69, 217, 230, 0.3)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }
    },
  },
  plugins: [],
}
