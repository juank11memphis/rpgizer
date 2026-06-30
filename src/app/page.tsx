export default function Home() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,#312e81_0%,#111827_42%,#030712_100%)] px-6 py-20 text-white">
      <section className="w-full max-w-4xl rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-12">
        <p className="mb-5 inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100">
          RPGizer application foundation
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Build real-life quests on a clean Next.js baseline.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
          This scaffold proves RPGizer can render a branded App Router page with
          TypeScript and Tailwind. Product flows, auth, AI, and persistence stay
          reserved for future stories.
        </p>

        <div className="mt-10 grid gap-4 text-sm text-slate-200 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="font-semibold text-white">App Router</p>
            <p className="mt-2">Server-rendered default route.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="font-semibold text-white">TypeScript</p>
            <p className="mt-2">Strict project foundation.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="font-semibold text-white">Tailwind</p>
            <p className="mt-2">Visible styling with utility classes.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
