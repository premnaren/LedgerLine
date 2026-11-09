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
        // Dark Cosmic palette tokens (Cosmic Finance System)
        'cosmic-black': '#080713',
        'deep-space': '#100D20',
        'nebula-surface': '#151126',
        'midnight-violet': '#19132D',
        'elevated-surface': '#1C1630',
        'stellar-purple': '#8055E8',
        'nebula-glow': '#A88AFF',
        'muted-violet': '#291C49',
        'stellar-blue': '#648EFF',
        'magenta-glow': '#BD75E9',
        'soft-cyan': '#75C8F0',
        'card-surface': '#151126',
        'card-border': 'rgba(168, 138, 255, 0.14)',
        'primary-border': 'rgba(168, 138, 255, 0.14)',
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
        'cosmic-success': '#60C9BC',
        'cosmic-warning': '#F0B85A',
        'cosmic-error': '#F07889',

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
