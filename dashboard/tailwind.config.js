/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#1e1f22',
          darker: '#111214',
          light: '#2b2d31',
          lighter: '#313338',
          blurple: '#5865f2',
          green: '#57f287',
          yellow: '#fee75c',
          fuchsia: '#eb459e',
          red: '#ed4245',
          white: '#f2f3f5',
          muted: '#949ba4',
        },
      },
    },
  },
  plugins: [],
};
