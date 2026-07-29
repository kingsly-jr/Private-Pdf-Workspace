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
        // Luxury Obsidian & Ivory Cream Palette
        // Dark Obsidian Background: #11120D
        // Warm Cream Ivory Text & Accents: #FFFBF4
        brand: {
          50: '#ffffff',
          100: '#FFFBF4',
          200: '#f5efe4',
          300: '#e6decb',
          400: '#d4cbb8',
          500: '#b8ad98',
          600: '#8f8470',
          700: '#695f4e',
          800: '#453d30',
          900: '#262119',
          950: '#11120D',
        },
        slate: {
          700: '#2e2e28',
          800: '#23241e',
          850: '#1a1b15',
          900: '#171813',
          950: '#11120D',
        },
        cream: {
          50: '#ffffff',
          100: '#FFFBF4',
          200: '#f7f1e6',
          300: '#ebdcc7',
          400: '#d1c0a5',
          500: '#a8977d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'glow': '0 0 25px -5px rgba(255, 251, 244, 0.25)',
      }
    },
  },
  plugins: [],
}
