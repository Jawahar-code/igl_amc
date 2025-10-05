/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'igl-blue': '#1e3a8a',
        'igl-teal': '#0f766e',
        'igl-orange': '#ea580c',
      },
      animation: {
        'slide-right': 'slideRight 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-left': 'slideLeft 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'gradient': 'gradient 15s ease infinite',
      },
      keyframes: {
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0%)' }
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0%)' }
        },
        gradient: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' }
        }
      }
    },
  },
  plugins: [],
}
