import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display:  ["var(--font-display)", "serif"],
        headline: ["var(--font-headline)", "serif"],
        body:     ["var(--font-body)", "sans-serif"],
        mono:     ["var(--font-mono)", "monospace"],
      },
      colors: {
        // --surface existe dans themes.css et est géré par ThemeProvider
        'surface': 'var(--surface)',
      },
      boxShadow: {
        'editorial': '0 20px 40px rgba(27, 28, 26, 0.05)',
        'float':     '0 8px 32px rgba(27, 28, 26, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
