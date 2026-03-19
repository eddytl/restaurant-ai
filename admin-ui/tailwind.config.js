/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf2f2',
          100: '#fce3e3',
          200: '#f9b8b8',
          300: '#f27f7f',
          400: '#e44f4f',
          500: '#c42828',
          600: '#8b1a1a',
          700: '#721515',
          800: '#5a1010',
          900: '#3d0a0a',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
