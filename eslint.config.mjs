import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Disable some Next.js rules that conflict with our patterns
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "warn",
    },
  },
];