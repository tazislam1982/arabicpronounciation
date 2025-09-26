import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
export default function CourseRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="">
        <Navbar />
        <div className="py-10">
            {children}
        </div>
        <Footer/>
      </body>
    </html>
  );
}
