import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#F5C400",
          light: "#FFF4B8"
        }
      },
      boxShadow: {
        card: "0 10px 25px rgba(0,0,0,0.06)"
      }
    },
  },
  plugins: [],
}
export default config
