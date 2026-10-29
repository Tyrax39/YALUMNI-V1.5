import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "#f9f9ff",
        ink: "#191c21",
        muted: "#424751",
        primary: "#004A99",
        secondary: "#00875A",
        accent: "#F59E0B",
        success: "#10B981",
        warning: "#FBBF24",
        danger: "#EF4444",
        border: "#E5E7EB"
      },
      fontFamily: {
        display: ["Work Sans", "Inter", "Segoe UI", "Arial", "sans-serif"],
        body: ["Public Sans", "Inter", "Segoe UI", "Arial", "sans-serif"]
      },
      boxShadow: {
        soft: "0 16px 50px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;

