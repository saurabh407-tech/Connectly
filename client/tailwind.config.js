/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#080b10',
          900: '#0c1117',
          800: '#121922',
          700: '#18212c',
          600: '#243040',
          500: '#344256',
        },
        lagoon: {
          300: '#7ff0dc',
          400: '#3ee0c1',
          500: '#1fc9aa',
          600: '#14a88d',
        },
      },
    },
  },
  plugins: [],
};
