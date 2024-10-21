/** @type {import('tailwindcss').Config} */
export const content = [
  './pages/**/*.{js,ts,jsx,tsx}',
  './components/**/*.{js,ts,jsx,tsx}',
  './app/**/*.{js,ts,jsx,tsx}',
]
export const theme = {
  extend: {
    fontFamily: {
      default: ['var(--font-inter)'],
    },
  },
}
export const plugins = []
