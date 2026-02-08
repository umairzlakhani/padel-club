import ApplicationModal from "./components/ApplicationModal";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      {/* Background glow effect */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      {/* Hero content */}
      <main className="relative z-10 flex max-w-3xl flex-col items-center gap-8 text-center">
        {/* Badge */}
        <span className="inline-block rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Invite Only
        </span>

        {/* Headline */}
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
          Karachi&apos;s Exclusive
          <br />
          <span className="text-accent">Padel Network</span>
        </h1>

        {/* Subheadline */}
        <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
          A members-only matchmaking platform for the city&apos;s most
          competitive Padel players. Curated. Skill-matched. Premium.
        </p>

        {/* CTA */}
        <ApplicationModal />

        {/* Social proof line */}
        <p className="mt-2 text-sm text-muted">
          Limited to 1,000 founding members
        </p>
      </main>
    </div>
  );
}
