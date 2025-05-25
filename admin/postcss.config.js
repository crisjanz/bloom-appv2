import tailwind from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwind(),        // ✅ use as an array, not as a key:value pair
    autoprefixer(),
  ],
};
