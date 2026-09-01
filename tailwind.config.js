/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── LOAD brand palette ──────────────────────────────────────────────
        // Primary brand colour: #A8D8FF (soft periwinkle blue)
        load: {
          50:  '#f0f8ff',  // near-white tint
          100: '#daf0ff',  // very light brand surface
          200: '#bde4ff',  // light hover surface
          300: '#A8D8FF',  // PRIMARY BRAND COLOUR
          400: '#79c2f8',  // medium accent
          500: '#4ba8e8',  // interactive blue
          600: '#2a8fd4',  // dark interactive / CTA
          700: '#1d72ab',  // deep blue for text
          800: '#175880',  // darkest blue surface
          900: '#0f3a56',  // near-black blue
        },
        // ── Semantic surfaces ───────────────────────────────────────────────
        'load-bg':     '#f5faff',   // page background (very-light brand tint)
        'card-border': '#daf0ff',   // soft card border (load-100)
        ink:           '#0f172a',   // primary text
        muted:         '#5e7a93',   // secondary / supporting text
        // ── Status colours ──────────────────────────────────────────────────
        'status-success': '#16a34a',
        'status-warning': '#d97706',
        'status-error':   '#dc2626',
        'status-info':    '#2a8fd4',  // load-600
        // ── Utility ─────────────────────────────────────────────────────────
        divider:  '#e1eef8',
        disabled: '#b8cfe0',
        // ── Input / control surfaces ─────────────────────────────────────────
        'input-bg':     '#ffffff',
        'input-border': '#c0d9ee',
        'input-focus':  '#A8D8FF',  // brand-300
      },
      boxShadow: {
        panel: '0 4px 24px rgba(15, 23, 42, 0.06)',
        card:  '0 2px 12px rgba(15, 23, 42, 0.04)',
        glow:  '0 8px 32px rgba(168, 216, 255, 0.35)',  // brand-colour glow
        modal: '0 20px 60px rgba(15, 23, 42, 0.18)',
        toast: '0 8px 24px rgba(15, 23, 42, 0.12)',
        input: '0 0 0 3px rgba(168, 216, 255, 0.45)',   // focus ring
      },
      borderRadius: {
        panel:  '1.5rem',   // outer card / container
        card:   '1rem',     // inner card
        pill:   '9999px',   // buttons / badges
        input:  '0.75rem',  // form controls
        modal:  '1.25rem',  // modal / drawer
      },
      spacing: {
        'section':   '2rem',
        'card-pad':  '1.25rem',
        'mobile-x':  '1rem',
        'desktop-x': '1.5rem',
      },
      height: {
        control: '3rem',    // 48px — standard control height
        'control-sm': '2.25rem',  // 36px — compact control
        'control-lg': '3.5rem',   // 56px — large control
      },
      width: {
        'icon-sm': '1.25rem',   // 20px
        'icon-md': '1.5rem',    // 24px
        'icon-lg': '2rem',      // 32px
        'icon-xl': '2.5rem',    // 40px
      },
      fontSize: {
        'display': ['2rem',     { lineHeight: '1.2',  fontWeight: '700' }],
        'heading': ['1.5rem',   { lineHeight: '1.3',  fontWeight: '600' }],
        'title':   ['1.125rem', { lineHeight: '1.4',  fontWeight: '600' }],
        'body':    ['0.875rem', { lineHeight: '1.6' }],
        'caption': ['0.75rem',  { lineHeight: '1.5' }],
        'label':   ['0.6875rem',{ lineHeight: '1.4',  fontWeight: '600', letterSpacing: '0.05em' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'soft-grid':  'radial-gradient(circle at top, rgba(168,216,255,0.18), transparent 40%)',
        'load-hero':  'linear-gradient(135deg, #A8D8FF 0%, #2a8fd4 100%)',
        'load-card':  'linear-gradient(135deg, #f0f8ff 0%, #daf0ff 100%)',
        'load-pass':  'linear-gradient(135deg, #1d72ab 0%, #0f3a56 100%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:    { '0%': { transform: 'translateY(8px)',  opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown:  { '0%': { transform: 'translateY(-8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseSoft:  { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
    },
  },
  plugins: [],
}
