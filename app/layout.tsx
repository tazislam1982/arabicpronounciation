import type { Metadata } from "next"
import { Toaster } from "sonner";
import  "./globals.css"



export const metadata: Metadata = {
  title: "Arabic Pronunciation App",
  description: "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}


