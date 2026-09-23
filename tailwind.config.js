/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontSize: {
      xs: ["12px", { lineHeight: "16px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "24px" }],
      lg: ["18px", { lineHeight: "28px" }],
      xl: ["20px", { lineHeight: "28px" }],
      "2xl": ["24px", { lineHeight: "32px" }],
      "3xl": ["30px", { lineHeight: "36px" }],
      "4xl": ["40px", { lineHeight: "44px", letterSpacing: "-0.02em" }],
      "5xl": ["56px", { lineHeight: "58px", letterSpacing: "-0.02em" }],
      "6xl": ["72px", { lineHeight: "72px", letterSpacing: "-0.03em" }],
    },
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        button: "rgb(var(--color-button) / <alpha-value>)",
        "button-hover": "rgb(var(--color-button-hover) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-doto)", "sans-serif"],
        mono: ["var(--font-helvetica-now)", "Helvetica Neue", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
