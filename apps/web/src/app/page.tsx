import Link from "next/link";

/** Landing page with value proposition. */
export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
        Blitz Checkers
      </h1>
      <p className="text-xl text-stone-600 dark:text-stone-400 mb-8 max-w-2xl mx-auto">
        Русские шашки за 3 минуты. Сыграй blitz, поднимай Elo, получи разбор от
        AI Coach.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/play"
          className="px-8 py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-lg shadow-lg"
        >
          Играть Blitz
        </Link>
        <Link
          href="/leaderboard"
          className="px-8 py-4 rounded-xl border-2 border-amber-600 text-amber-600 font-bold text-lg hover:bg-amber-50 dark:hover:bg-amber-950/30"
        >
          Лидерборд
        </Link>
      </div>
      <div className="mt-16 grid sm:grid-cols-3 gap-6 text-left">
        <Feature
          title="⚡ Blitz 3:00"
          desc="Быстрые партии с часами — идеально для тренировки"
        />
        <Feature
          title="🔗 Игра по ссылке"
          desc="Пригласи друга — рейтинговый матч в реальном времени"
        />
        <Feature
          title="🤖 AI Coach"
          desc="Разбор ошибок и пропущенных взятий после партии"
        />
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-stone-500 text-sm">{desc}</p>
    </div>
  );
}
