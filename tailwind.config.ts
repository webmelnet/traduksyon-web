import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

// "Friendly Teal" palette — see CLAUDE.md for the colour-role table.
const config: Config = {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: '#0D9488', // main CTA, active nav, buttons
                    hover: '#0F766E', // button hover, active states
                    deep: '#0F766E', // hero cards
                    fresh: '#14B8A6',
                    mint: '#CCFBF1',
                },
                dark: '#142C3E', // logo, headings, sidebar
                ink: '#1E293B',
                ai: {
                    DEFAULT: '#8B5CF6', // AI summaries, smart insights
                    soft: '#EDE9FE',
                },
                canvas: '#F8FAFC', // app background
                warm: '#F8FAF9',
                surface: '#FFFFFF', // cards, panels, modals
                line: '#E2E8F0', // dividers, inputs, card borders
                body: '#334155', // main text
                muted: '#64748B', // secondary text, timestamps
                success: '#16A34A',
                warning: '#F59E0B',
                danger: '#EF4444',
            },
            boxShadow: {
                card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
            },
            screens: {
                xs: '420px',
            },
        },
    },
    plugins: [forms],
}

export default config
