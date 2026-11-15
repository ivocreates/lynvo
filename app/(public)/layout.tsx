import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";


// Content comes from D1 on every request (CMS edits show immediately).
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
