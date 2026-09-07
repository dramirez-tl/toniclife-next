// ESLint 9 (flat config). eslint-config-next 16 exporta configs flat nativas
// (core-web-vitals y typescript): se usan directo, sin FlatCompat de
// @eslint/eslintrc, que con esta versión abortaba todo lint con
// "TypeError: Converting circular structure to JSON" (ciclo entre
// eslint-config-next 16 y eslint-plugin-react al validar los plugins).
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [...nextVitals, ...nextTs];

export default eslintConfig;
