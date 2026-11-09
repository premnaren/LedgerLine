/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cosmic Design System tokens
        'deep-space': '#080E1C',
        'midnight-navy': '#0B1220',
        'secondary-surface': '#111C30',
        'elevated-surface': '#17243A',
        'primary-border': '#263750',
        'secondary-border': '#1D2A40',
        'stellar-blue': '#79A9FF',
        'active-blue': '#91B8FF',
        'nebula-violet': '#A78BFA',
        'cosmic-success': '#42D6B0',
        'cosmic-warning': '#F4B860',
        'cosmic-error': '#F07886',
        'primary-text': '#F4F7FF',
        'secondary-text': '#A5B4CC',
        'muted-text': '#71819B',

        // Dynamic theme tokens
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-secondary': 'var(--surface-secondary)',
        'surface-elevated': 'var(--surface-elevated)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        'border-secondary': 'var(--border-secondary)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        nebula: 'var(--nebula)',

        // Module accents
        'accent-accounts': 'var(--accent-accounts)',
        'accent-audit': 'var(--accent-audit)',
        'accent-stress': 'var(--accent-stress)',
        'accent-seal': 'var(--accent-seal)',
        'accent-failed': 'var(--accent-failed)',

        // Semantic aliases
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        'ink-faint': 'var(--ink-faint)',
        paper: 'var(--paper)',
        rule: 'var(--rule)',
        'rule-strong': 'var(--rule-strong)',
        'ledger-green': 'var(--ledger-green)',
        'ledger-red': 'var(--ledger-red)',
        accent: 'var(--accent)',
        'role-admin': 'var(--role-admin)',
        'role-holder': 'var(--role-holder)',
        'role-auditor': 'var(--role-auditor)',

        background: 'var(--paper)',
        foreground: 'var(--ink)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--ink)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
