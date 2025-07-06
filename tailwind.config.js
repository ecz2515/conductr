/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'conductr-gold': '#D4AF37',
        'conductr-dark': '#1a1a1a',
        'conductr-gray': '#f5f5f5',
      },
    },
  },
  plugins: [],
}