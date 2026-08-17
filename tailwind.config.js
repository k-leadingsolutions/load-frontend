/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        load: {
          50: '#f4f9ff',
          100: '#e8f3ff',
          200: '#cce4ff',
          300: '#9dcbff',
          400: '#66abff',
          500: '#338aff',
          600: '#1f6fe0',
          700: '#1f59b0',
          800: '#224b8d',
          900: '#234173'
        },
        ink: '#0f172a'
      },
      boxShadow: {
        panel: '0 18px 45px rgba(15, 23, 42, 0.08)',
        glow: '0 18px 40px rgba(51, 138, 255, 0.18)'
      },
      borderRadius: {
        panel: '1.5rem'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'soft-grid': 'radial-gradient(circle at top, rgba(51,138,255,0.12), transparent 35%)'
      }
    }
  },
  plugins: []
}
