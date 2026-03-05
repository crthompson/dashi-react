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
        dashi: {
          bg: '#0a0a0f',
          surface: '#12121a',
          card: '#1a1a25',
          border: '#2a2a3a',
          'border-hover': '#3a3a50',
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#4ecdc4',
          danger: '#ff6b6b',
          warning: '#f093fb',
          success: '#4ade80',
          muted: '#6b7280',
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
        'gradient-danger': 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
        'gradient-dark': 'linear-gradient(180deg, #1a1a25 0%, #12121a 100%)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(102, 126, 234, 0.3)',
        'glow-accent': '0 0 20px rgba(78, 205, 196, 0.3)',
      }
    },
  },
  plugins: [],
}