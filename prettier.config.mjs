/**
 * Prettier 3 defaults are intentional for most options.
 * Only override what this stack benefits from being explicit about.
 *
 * @see https://prettier.io/docs/options
 * @type {import("prettier").Config & import("prettier-plugin-tailwindcss").PluginOptions}
 */
const config = {
  // Match existing Next style in this repo.
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  arrowParens: "always",
  endOfLine: "lf",
  bracketSpacing: true,
  bracketSameLine: false,
  jsxSingleQuote: false,
  quoteProps: "as-needed",

  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind CSS v4: point at the stylesheet that loads theme/utilities.
  tailwindStylesheet: "./src/app/globals.css",
};

export default config;
