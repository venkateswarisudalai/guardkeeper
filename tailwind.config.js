/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d8d9dd',
          300: '#b3b5bd',
          400: '#878a96',
          500: '#5d616f',
          600: '#3f4350',
          700: '#2b2e38',
          800: '#1c1e25',
          900: '#0f1116',
        },
        accent: {
          50: '#eef7ff',
          100: '#d9ecff',
          200: '#bcdfff',
          300: '#8fcbff',
          400: '#5cafff',
          500: '#2f8eff',
          600: '#1c6ff0',
          700: '#1858c4',
          800: '#1a4a9c',
          900: '#1c407c',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,17,22,0.04), 0 4px 16px rgba(15,17,22,0.06)',
        ring: '0 0 0 1px rgba(15,17,22,0.06), 0 1px 2px rgba(15,17,22,0.04)',
      },
    },
  },
  plugins: [],
}
