import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { CloudProvider } from "@/context/CloudContext";
import { JobTray } from "@/components/cloud/JobTray";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <CloudProvider>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-8">{children}</main>
        <JobTray />
      </CloudProvider>
    </Providers>
  );
}
