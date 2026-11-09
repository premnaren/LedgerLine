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
        // Institutional Blue core tokens
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-secondary': 'var(--surface-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        border: 'var(--border)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',

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
