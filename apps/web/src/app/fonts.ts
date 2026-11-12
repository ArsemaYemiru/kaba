import { Inter, Noto_Sans_Ethiopic, Unbounded } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

export const ethiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-noto-ethiopic",
  display: "swap",
});

export const fontVariables = `${inter.variable} ${unbounded.variable} ${ethiopic.variable}`;
