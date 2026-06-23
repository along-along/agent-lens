/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "Fira Code", "monospace"],
      },
      colors: {
        app: {
          bg:       "#fafaf9",
          sidebar:  "#f3f4f6",
          card:     "#ffffff",
          border:   "#e5e5e5",
          text:     "#1a1a2e",
          muted:    "#6b7280",
          subtle:   "#9ca3af",
          accent:   "#3b82f6",
          "accent-dim": "#2563eb",
          green:    "#16a34a",
          amber:    "#d97706",
          red:      "#dc2626",
          purple:   "#7c3aed",
        },
      },
    },
  },
  plugins: [],
};
