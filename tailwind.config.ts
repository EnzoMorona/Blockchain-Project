import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "reel-pop": {
          "0%": { transform: "scale(0.85)", opacity: "0.4" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "reel-pop": "reel-pop 150ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
