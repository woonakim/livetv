import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          primary: "#0ea5e9",
          dark: "#0369a1",
          light: "#e0f2fe",
          accent: "#000000",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "Noto Sans KR", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
