/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        barlow: ['Barlow', 'sans-serif'],
        'barlow-condensed': ['Barlow Condensed', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
      },
      colors: {
        gg: {
          bg:           '#090E0D',
          surface:      '#111918',
          surface2:     '#182420',
          surface3:     '#1F2E28',
          text:         '#EEF8F4',
          'text-sub':   '#7BA898',
          'text-muted': '#3D6558',
          a1:           '#059669',
          a2:           '#34D399',
          'active-border': '#F59E0B',
          error:        '#EF4444',
        },
      },
      borderRadius: {
        '4xl': '28px',
        '5xl': '36px',
      },
    },
  },
}
