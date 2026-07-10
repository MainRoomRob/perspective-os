import type { Metadata } from "next";
import { Barlow, Sofia_Sans_Extra_Condensed } from "next/font/google";
import { ThemeProvider } from "@/ui/ThemeProvider";
import "./app.css";

const display = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-display",
});

const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Perspective OS",
  description: "Multi-perspective research framework",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="product-dark"
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("mrs-theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="app">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
