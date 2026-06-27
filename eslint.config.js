import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "src/app/components/ui", "src/app/components/figma"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { document: "readonly", window: "readonly", navigator: "readonly", localStorage: "readonly", File: "readonly", HTMLButtonElement: "readonly", React: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-empty": "off",
    },
  },
);
