/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Reddish-Brown Design System
        primary: {
          DEFAULT: '#883A2E',
          50: '#FDF5F3',
          100: '#F9E7E3',
          200: '#F2C8BF',
          300: '#E4A093',
          400: '#D27160',
          500: '#883A2E',
          600: '#752F24',
          700: '#62251B',
          800: '#501D15',
          900: '#3D150F',
        },
        darkbrown: {
          DEFAULT: '#542A20',
          50: '#FBF5F4',
          100: '#F5E6E3',
          200: '#E7C8C1',
          300: '#D4A397',
          400: '#8E4837',
          500: '#542A20',
          600: '#46231B',
          700: '#381C15',
          800: '#2A1510',
          900: '#1C0E0B',
        },
        rust: {
          DEFAULT: '#D65A31',
          50: '#FEF6F3',
          100: '#FCE7DF',
          200: '#F8C8B6',
          300: '#F2A083',
          400: '#EA7249',
          500: '#D65A31',
          600: '#BA461F',
          700: '#943819',
          800: '#6E2A13',
          900: '#481C0C',
        },
        lightbrown: {
          DEFAULT: '#C47A5A',
          50: '#FCF8F6',
          100: '#F7EEEA',
          200: '#ECD5CA',
          300: '#DFB7A4',
          400: '#D1967B',
          500: '#C47A5A',
          600: '#A95E3E',
          700: '#854A31',
          800: '#613624',
          900: '#3E2217',
        },
        // Semantic Canvas Tokens
        background: '#FFF7F4',
        surface: '#FFFDFC',
        'surface-raised': '#FFFFFF',
        'surface-subtle': '#FAF0EC',
        'primary-text': '#2B1F1D',
        'secondary-text': '#7A6360',
        'muted-text': '#A08A87',
        'border-warm': '#EEDFD9',
        'border-subtle': '#F4E9E4',
        success: {
          DEFAULT: '#2E7D32',
          50: '#F1F8F2',
          100: '#E1EFE3',
          500: '#2E7D32',
          600: '#256628',
          700: '#1B4C1E',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(84, 42, 32, 0.05), 0 1px 2px rgba(84, 42, 32, 0.03)',
        'warm': '0 4px 14px -1px rgba(84, 42, 32, 0.07), 0 2px 6px -1px rgba(84, 42, 32, 0.04)',
        'warm-lg': '0 10px 25px -3px rgba(84, 42, 32, 0.1), 0 4px 10px -2px rgba(84, 42, 32, 0.05)',
        'warm-xl': '0 20px 35px -5px rgba(84, 42, 32, 0.12), 0 10px 15px -4px rgba(84, 42, 32, 0.06)',
      }
    },
  },
  plugins: [],
}
