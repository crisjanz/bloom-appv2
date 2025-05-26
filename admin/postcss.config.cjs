module.exports = {
  plugins: [
    require('@tailwindcss/postcss')(), // 👈 This is the Tailwind v4 PostCSS plugin
    require('autoprefixer'),
  ],
};
