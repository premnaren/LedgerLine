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

        border: 'var(--rule)',
        background: 'var(--paper)',
        foreground: 'var(--ink)',
        primary: {
          DEFAULT: 'var(--accent)',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: 'var(--ink)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
      },
    },
  },
  plugins: [],
};
