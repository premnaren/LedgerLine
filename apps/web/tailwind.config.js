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
        // Midnight Nebula official design tokens
        midnight: '#090B14',
        'deep-navy': '#101426',
        'elevated-surface': '#171D32',
        'nebula-violet': '#8B7CFF',
        'starlight-lavender': '#B6A9FF',
        'cosmic-cyan': '#67D5D0',
        'text-primary-token': '#F4F5FA',
        'text-secondary-token': '#A3A8BA',
        'text-muted-token': '#747B91',
        'border-default': '#35334D',
        'border-subtle': 'rgba(182, 169, 255, 0.13)',
        'border-active': 'rgba(139, 124, 255, 0.45)',

        // Semantic tokens
        'semantic-success': '#5DD6A0',
        'semantic-warning': '#F0BD72',
        'semantic-danger': '#F08091',
        'semantic-info': '#67D5D0',

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
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
        'glass-lg': '0 12px 40px -4px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
