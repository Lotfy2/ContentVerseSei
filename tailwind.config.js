/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sei: {
          primary: '#7C3AED',    // Vibrant purple
          secondary: '#9F7AEA',  // Lighter purple
          accent: '#4F46E5',     // Deep indigo
          highlight: '#C084FC',  // Soft purple
          dark: '#0F172A',       // Deep blue-black
          'dark-light': '#1E293B',
          'dark-lighter': '#334155',
          surface: '#1E293B',
          muted: '#94A3B8'
        },
      },
      animation: {
        'gradient': 'gradient 8s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            'box-shadow': '0 0 20px rgba(124, 58, 237, 0.3)',
          },
          '50%': {
            opacity: '.8',
            'box-shadow': '0 0 40px rgba(124, 58, 237, 0.6)',
          },
        },
      },
      backgroundImage: {
        'sei-gradient': 'linear-gradient(to right, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};