/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        command: {
          950: '#060913',
          900: '#0c1222',
          850: '#11192e',
          800: '#17233f',
          700: '#223259',
          600: '#324a80',
          accent: '#0ea5e9',
          cyan: '#06b6d4',
          emerald: '#10b981',
          crimson: '#f43f5e',
          amber: '#f59e0b',
          violet: '#8b5cf6'
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
