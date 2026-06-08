export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8f0fb',
          100: '#c5d8f6',
          200: '#9ebef0',
          300: '#77a4ea',
          400: '#5990e5',
          500: '#3b7de0',
          600: '#2563c4',
          700: '#1a4a9a',
          800: '#123370',
          900: '#0a1f46',
        },
        dark: {
          900: '#0a1628',
          800: '#0f2040',
          700: '#152a52',
          600: '#1a3464',
        }
      }
    }
  },
  plugins: []
}
