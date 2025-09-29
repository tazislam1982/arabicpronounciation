// server component
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose"; // or your verifySession helper

export default async function SecureLayout({ children }: { children: React.ReactNode }) {
  // Optional defense-in-depth auth check (middleware should already protect)
  const token = cookies().get("session")?.value;
  if (!token) redirect("/"); // login page (root)

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
  } catch {
    redirect("/");
  }

  return (
    <>
      <Navbar />             {/* your client component is fine here */}
      <div className="py-10">{children}</div>
      <Footer />
    </>
  );
}
