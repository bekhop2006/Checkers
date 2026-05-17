import { Suspense } from "react";

/** Suspense boundary for useSearchParams in room page. */
export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<p className="p-8 text-center">Загрузка...</p>}>{children}</Suspense>;
}
