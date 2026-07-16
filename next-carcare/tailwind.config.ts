import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        carcare: {
          yellow: "#FFCC00",
          black: "#111111",
          white: "#FFFFFF",
          bg: "#F8F8F8"
        }
      },
      boxShadow: {
        soft: "0 16px 40px rgba(17, 17, 17, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
