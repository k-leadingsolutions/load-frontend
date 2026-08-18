/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // LOAD brand palette – soft sky-blue (matches Module 2/3 design references)
        load: {
          50:  '#f0f7ff',
          100: '#ddeeff',
          200: '#b8dcff',
          300: '#85c2ff',
          400: '#4fa3f0',
          500: '#2d87d4',
          600: '#1a6dba',
          700: '#155796',
          800: '#144878',
          900: '#103a60',
        },
        // Semantic surfaces
        'load-bg':   '#f4f9ff',   // very-light blue page background
        'card-border': '#ddeeff', // soft card border
        ink:         '#0f172a',   // dark primary text
        muted:       '#64748b',   // secondary text
        // Soft status colours
        'status-success': '#22c55e',
        'status-warning': '#f59e0b',
        'status-error':   '#ef4444',
        'status-info':    '#2d87d4',
        divider: '#e2e8f0',
        disabled: '#cbd5e1',
      },
      boxShadow: {
        // Softer, lighter than before
        panel: '0 4px 24px rgba(15, 23, 42, 0.06)',
        card:  '0 2px 12px rgba(15, 23, 42, 0.04)',
        glow:  '0 8px 32px rgba(45, 135, 212, 0.14)',
        // Slightly deeper for elevated elements
        modal: '0 20px 60px rgba(15, 23, 42, 0.16)',
      },
      borderRadius: {
        panel:  '1.5rem',  // card / container
        card:   '1rem',    // inner card
        pill:   '9999px',  // buttons / badges
      },
      spacing: {
        // Standardised mobile / section gaps
        'section': '2rem',
        'card-pad': '1.25rem',
        'mobile-x': '1rem',
        'desktop-x': '1.5rem',
      },
      height: {
        control: '3rem',
      },
      fontSize: {
        // Typography hierarchy
        'display':  ['2rem',   { lineHeight: '1.2', fontWeight: '700' }],
        'heading':  ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'title':    ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body':     ['0.875rem', { lineHeight: '1.6' }],
        'caption':  ['0.75rem',  { lineHeight: '1.5' }],
        'label':    ['0.6875rem',{ lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.05em' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'soft-grid': 'radial-gradient(circle at top, rgba(45,135,212,0.08), transparent 40%)',
        'load-hero': 'linear-gradient(135deg, #2d87d4 0%, #1a6dba 100%)',
        'load-card': 'linear-gradient(135deg, #f0f7ff 0%, #ddeeff 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
