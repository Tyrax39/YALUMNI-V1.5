import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/frontend-shared/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: "#F59E0B",
        border: "#E5E7EB",
        danger: "#EF4444",
        ink: "#191C21",
        muted: "#424751",
        primary: "#004A99",
        secondary: "#00875A",
        surface: "#F9F9FF",
        success: "#10B981",
        warning: "#FBBF24"
      },
      fontFamily: {
        body: ["Public Sans", "Inter", "Segoe UI", "Arial", "sans-serif"],
        display: ["Work Sans", "Inter", "Segoe UI", "Arial", "sans-serif"]
      },
      boxShadow: {
        soft: "0 16px 50px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
