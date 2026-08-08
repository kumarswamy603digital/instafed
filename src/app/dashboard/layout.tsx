import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-neutral-950">
      {/* Branded background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 h-[32rem] w-[32rem] rounded-full bg-[#833AB4] opacity-[0.12] blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[32rem] w-[32rem] rounded-full bg-[#E1306C] opacity-[0.12] blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <NavBar userName={session.user.name || session.user.email || "You"} />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 min-h-[calc(100vh-3.5rem)]">
        {children}
      </main>
    </div>
  );
}
