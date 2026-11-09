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
        // Dark Cosmic palette tokens (Reference 1)
        'cosmic-black': '#080712',
        'deep-space': '#100D20',
        'midnight-violet': '#17112D',
        'nebula-purple': '#542A91',
        'electric-violet': '#8155D9',
        'stellar-blue': '#648EFF',
        'magenta-glow': '#BD75E9',
        'soft-cyan': '#75C8F0',
        'elevated-surface': '#171629',
        'card-surface': '#19172B',
        'card-border': '#34304D',
        'primary-border': '#34304D',
        'secondary-border': '#221F38',

        // Light Cosmic palette tokens
        'cosmic-ivory': '#F4F1FA',
        'lunar-white': '#FAF9FF',
        'pale-lavender': '#EEE8FA',
        'soft-nebula': '#D6C2F4',
        'celestial-pink': '#F0C7E5',
        'aurora-blue': '#C4DDF9',
        'peach-glow': '#F6D9CE',
        'border-light': '#DED9EA',

        // Semantic Cosmic tokens
        'cosmic-success': '#42D6B0',
        'cosmic-warning': '#F4B860',
        'cosmic-error': '#F07886',

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
