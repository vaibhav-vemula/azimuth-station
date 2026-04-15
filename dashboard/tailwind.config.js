/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: "#0a0e1a",
          800: "#111827",
          700: "#1e293b",
          600: "#334155",
        },
      },
    },
  },
  plugins: [],
};
