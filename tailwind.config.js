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
        paper: {
          white: '#ffffff',
          sepia: '#fbf0d9',
          dark: '#1e1e24',
          yellow: '#fdf6e2',
          grid: '#e2e8f0',
          line: '#cbd5e1'
        }
      }
    },
  },
  plugins: [],
}
