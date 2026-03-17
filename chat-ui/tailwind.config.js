/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        tc: {
          bg:           'var(--bg)',
          sidebar:      'var(--bg-sidebar)',
          surface:      'var(--bg-surface)',
          hover:        'var(--bg-surface-hover)',
          input:        'var(--bg-input)',
          suggestion:   'var(--bg-suggestion)',
          'table-header': 'var(--bg-table-header)',
          'table-hover':  'var(--bg-table-row-hover)',
          'bg-error':   'var(--bg-error)',
          accent:       'var(--accent)',
          'accent-h':   'var(--accent-hover)',
          border:       'var(--border)',
          'border-h':   'var(--border-hover)',
          text:         'var(--text)',
          'text-2':     'var(--text-secondary)',
          muted:        'var(--text-muted)',
          faint:        'var(--text-very-muted)',
          'err-text':   'var(--error-text)',
          'err-border': 'var(--error-border)',
          'code-bg':    'var(--code-bg)',
          'code-text':  'var(--code-text)',
        },
      },
      keyframes: {
        'bounce-dot': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%':           { transform: 'translateY(-6px)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        'menu-in': {
          from: { opacity: '0', transform: 'scale(0.95) translateY(-6px)' },
          to:   { opacity: '1', transform: 'scale(1)   translateY(0)' },
        },
      },
      animation: {
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        'blink':      'blink 0.8s step-end infinite',
        'menu-in':    'menu-in 0.12s ease',
      },
    },
  },
  plugins: [],
};
