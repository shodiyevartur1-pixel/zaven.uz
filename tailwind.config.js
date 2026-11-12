/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            DEFAULT: '#0F3D2E',
            hover: '#16533F',
            dark: '#09261C',
            light: '#E7F1ED',
            muted: '#2B6853',
          },
          gold: {
            DEFAULT: '#C89D54',
            hover: '#B5893E',
            light: '#FBF6EC',
            border: '#E5C992',
            dark: '#9E7632',
          },
        },
        surface: {
          page: '#F8F9FA',
          card: '#FFFFFF',
          subtle: '#F1F3F5',
          border: '#E5E7EB',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(17, 24, 39, 0.06), 0 1px 2px -1px rgba(17, 24, 39, 0.04)',
        'card-hover': '0 4px 12px -2px rgba(15, 61, 46, 0.08), 0 2px 4px -2px rgba(15, 61, 46, 0.04)',
      },
    },
  },
  plugins: [],
};
