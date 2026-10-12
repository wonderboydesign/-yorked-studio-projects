/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    // Escala tomada del template de referencia: tracking -0.02em en todo
    fontSize: {
      xs: ["13px", { lineHeight: "18px", letterSpacing: "-0.01em" }],
      sm: ["14px", { lineHeight: "19.6px", letterSpacing: "-0.02em" }],
      base: ["16px", { lineHeight: "22.4px", letterSpacing: "-0.02em" }],
      lg: ["18px", { lineHeight: "21.6px", letterSpacing: "-0.02em" }],
      xl: ["20px", { lineHeight: "24px", letterSpacing: "-0.02em" }],
      "2xl": ["26px", { lineHeight: "31.2px", letterSpacing: "-0.02em" }],
      "3xl": ["32px", { lineHeight: "38.4px", letterSpacing: "-0.02em" }],
      "4xl": ["40px", { lineHeight: "52px", letterSpacing: "-0.02em" }],
      "5xl": ["48px", { lineHeight: "57.6px", letterSpacing: "-0.02em" }],
      "6xl": ["72px", { lineHeight: "72px", letterSpacing: "-0.04em" }],
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
        "accent-fg": "rgb(var(--color-accent-fg) / <alpha-value>)",
      },
      borderRadius: {
        "3xl": "32px",
      },
      fontFamily: {
        sans: ['"Open Sauce Sans"', "Helvetica Neue", "Arial", "sans-serif"],
        // Antes eran Doto y Helvetica Now; ahora todo usa la misma familia
        display: ['"Open Sauce Sans"', "Helvetica Neue", "Arial", "sans-serif"],
        mono: ['"Open Sauce Sans"', "Helvetica Neue", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
