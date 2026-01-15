/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // HytalePanel Adaptive Theme (Dark & Light)
        primary: {
          bg: '#0f1419',
          'bg-secondary': '#1a1f2e',
          'light-bg': '#f8fafc',
          'light-bg-secondary': '#ffffff',
        },
        accent: {
          primary: '#f59e0b',
          secondary: '#06b6d4',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#f43f5e',
        text: {
          primary: '#e2e8f0',
          muted: '#64748b',
          'light-primary': '#1e293b',
          'light-muted': '#64748b',
        },
      },
      fontFamily: {
        heading: ['Rajdhani', 'Exo 2', 'sans-serif'],
        body: ['IBM Plex Sans', 'Source Sans Pro', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
    },
  },
  plugins: [],
}
