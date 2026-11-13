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
        datacore: {
          softPink: '#F8C4DB',
          rose: '#F4A8CB',
          lavender: '#DCC5FA',
          purple: '#BFA1F5',
          peach: '#FFE1CE',
          warmWhite: '#FFFDFE',
          softGray: '#F5F2F7',
          deepText: '#30283C',
          darkBg: '#0f0e17',
          darkSurface: '#1a1829',
          darkBorder: '#2e2a47',
        },
        brand: {
          50: '#fcf6f9',
          100: '#f8eaf3',
          200: '#f8c4db',
          300: '#f4a8cb',
          400: '#dcc5fa',
          500: '#bfa1f5',
          600: '#9d75eb',
          700: '#7e4ddb',
          800: '#5e32b8',
          900: '#30283c',
          950: '#1b1524',
        },
      },
      backgroundImage: {
        'datacore-primary': 'linear-gradient(135deg, #F8C4DB, #DCC5FA, #BFA1F5)',
        'datacore-secondary': 'linear-gradient(120deg, #FFE1CE, #F8C4DB)',
        'datacore-accent': 'linear-gradient(135deg, #DCC5FA, #F4A8CB)',
        'datacore-bg': 'linear-gradient(135deg, #FFFDFE, #F5F2F7, #F8EAF3)',
        'datacore-dark-bg': 'linear-gradient(135deg, #0f0e17, #161426, #1c1833)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(191, 161, 245, 0.15)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      }
    },
  },
  plugins: [],
}
