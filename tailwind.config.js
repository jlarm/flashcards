/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,vue}'],
  theme: {
    extend: {
      colors: {
        background: '#f6f3ee',
        foreground: '#1c1a16',
        muted: '#e9e4dc',
        card: '#fffaf3',
        accent: '#1f6feb',
        ring: '#0a58ca',
        border: '#d8d0c4',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Source Serif 4"', 'serif'],
      },
      boxShadow: {
        soft: '0 14px 40px rgba(13, 16, 23, 0.12)',
      },
      borderRadius: {
        xl: '1.25rem',
      },
    },
  },
  plugins: [],
}
