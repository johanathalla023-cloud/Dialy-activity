import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcdaff",
          300: "#8ec3ff",
          400: "#59a2ff",
          500: "#337dff",
          600: "#1f5df5",
          700: "#1948e1",
          800: "#1b3cb6",
          900: "#1c388f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
