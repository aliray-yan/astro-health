import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  future: {
    // Touch has no hover — without this, iOS/Android fake a :hover on tap
    // and leave it stuck until the user taps elsewhere. Gates every
    // hover: utility behind @media (hover: hover) and (pointer: fine).
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        hull: {
          950: "rgb(var(--color-hull-950) / <alpha-value>)",
          900: "rgb(var(--color-hull-900) / <alpha-value>)",
          850: "rgb(var(--color-hull-850) / <alpha-value>)",
          800: "rgb(var(--color-hull-800) / <alpha-value>)",
          700: "rgb(var(--color-hull-700) / <alpha-value>)",
          600: "rgb(var(--color-hull-600) / <alpha-value>)",
          500: "rgb(var(--color-hull-500) / <alpha-value>)",
          400: "rgb(var(--color-hull-400) / <alpha-value>)",
          300: "rgb(var(--color-hull-300) / <alpha-value>)",
          200: "rgb(var(--color-hull-200) / <alpha-value>)",
          100: "rgb(var(--color-hull-100) / <alpha-value>)",
        },
        signal: {
          teal: "#2dd4bf",
          amber: "#f5a524",
          rose: "#fb5c74",
          violet: "#a78bfa",
          azure: "#5ec8f2",
        },
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(45,212,191,0.25), 0 0 24px -4px rgba(45,212,191,0.35)",
      },
      animation: {
        pulseSlow: "pulseSlow 2.4s ease-in-out infinite",
        fadeInUp: "fadeInUp 300ms var(--ease-out) backwards",
      },
      keyframes: {
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
