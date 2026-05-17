import Link from "next/link";
import { CreateBlitzRoom } from "@/features/multiplayer/components/CreateBlitzRoom";

/** Play hub — create blitz room or pick mode. */
export default function PlayPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Выберите режим</h1>
      <div className="flex flex-col gap-4">
        <CreateBlitzRoom />
        <Link
          href="/play/local"
          className="block w-full py-4 rounded-xl border-2 border-stone-300 dark:border-stone-700 text-center font-semibold hover:bg-stone-100 dark:hover:bg-stone-900"
        >
          Локально (2 игрока)
        </Link>
        <Link
          href="/play/ai"
          className="block w-full py-4 rounded-xl border-2 border-stone-300 dark:border-stone-700 text-center font-semibold hover:bg-stone-100 dark:hover:bg-stone-900"
        >
          Против AI
        </Link>
      </div>
    </div>
  );
}
