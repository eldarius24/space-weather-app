/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'andromeda-blue': {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bcceff',
          300: '#8dadff',
          400: '#5b82fc',
          500: '#3a60f6',
          600: '#2540e9',
          700: '#2032d5',
          800: '#202ba9',
          900: '#212984',
          950: '#171a4d',
        },
        'andromeda-purple': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
      },
    },
  },
  plugins: [],
};
