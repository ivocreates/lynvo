import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900: "#1C2E3A" },
        brand: { 700: "#345B73", 500: "#5D8196" },
        canvas: { warm: "#F7F2EA" },
        sage: { 500: "#8DA79A" },
        sand: { 400: "#D6C2A8" },
        clay: { 500: "#B97A58" },
        text: { primary: "#23333D", inverse: "#F5F6F4" },
        surface: "#FCFAF7",
        border: "#D8D2C8",
        success: "#5F8A69",
        warning: "#C89A49",
        error: "#B95B63",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        card: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
