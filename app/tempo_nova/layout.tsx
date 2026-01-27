import { LeftSidebar } from "@/components/LeftSidebar";
import { Suspense } from "react";

export default function TempoNovaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <Suspense fallback={<div className="w-[200px]" />}>
        <LeftSidebar />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
