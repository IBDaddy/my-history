export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'dot-gothic': ['"DotGothic16"', 'sans-serif'],
      },
      animation: {
        slideUp: 'slideUp 0.3s ease-out forwards',
      },
      keyframes: {
        slideUp: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
