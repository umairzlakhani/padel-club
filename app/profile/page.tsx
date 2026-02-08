"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Member {
  id: string;
  full_name: string;
  whatsapp_number: string;
  skill_level: number;
  status: string | null;
  created_at: string;
}

function getSkillTier(level: number): string {
  if (level <= 2.0) return "Beginner";
  if (level <= 4.0) return "Intermediate";
  if (level <= 5.5) return "Advanced";
  return "Elite";
}

function buildWhatsAppUrl(member: Member) {
  const number = member.whatsapp_number.replace(/[^0-9]/g, "");
  const text = encodeURIComponent(
    `Hey ${member.full_name}, I found you on Padel Club Karachi — want to play a match?`
  );
  return `https://wa.me/${number}?text=${text}`;
}

export default function ProfilePage() {
  const [player, setPlayer] = useState<Member | null>(null);
  const [phone, setPhone] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [view, setView] = useState<"dashboard" | "partners">("dashboard");
  const [partners, setPartners] = useState<Member[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);

    const { data, error } = await supabase
      .schema("public")
      .from("applications")
      .select("*")
      .eq("whatsapp_number", phone.trim())
      .eq("status", "member")
      .single();

    if (error || !data) {
      setLoginError("No approved membership found for this number.");
    } else {
      setPlayer(data as Member);
    }
    setLoggingIn(false);
  }

  async function handleFindPartners() {
    if (!player) return;
    setLoadingPartners(true);

    const { data, error } = await supabase
      .schema("public")
      .from("applications")
      .select("*")
      .eq("status", "member")
      .gte("skill_level", player.skill_level - 1)
      .lte("skill_level", player.skill_level + 1)
      .neq("id", player.id);

    if (error) {
      console.error("Partner fetch error:", JSON.stringify(error, null, 2));
    } else {
      setPartners((data as Member[]) ?? []);
    }
    setLoadingPartners(false);
    setView("partners");
  }

  // ── Login Gate ──
  if (!player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-white/5 bg-surface-light p-8"
        >
          <h1 className="mb-1 text-2xl font-bold text-white">
            Player Profile
          </h1>
          <p className="mb-6 text-sm text-muted">
            Enter your WhatsApp number to access your dashboard.
          </p>

          <label
            htmlFor="whatsapp"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted"
          >
            WhatsApp Number
          </label>
          <input
            id="whatsapp"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 300 1234567"
            className="mb-4 w-full rounded-lg border border-white/10 bg-background px-4 py-3 text-sm text-white placeholder-muted outline-none transition-colors focus:border-accent/40"
          />

          {loginError && (
            <p className="mb-4 text-sm text-red-400">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full cursor-pointer rounded-full bg-accent py-3 text-sm font-semibold text-background-deep transition-all duration-200 hover:bg-accent-dim hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] disabled:opacity-50"
          >
            {loggingIn ? "Verifying..." : "Access Dashboard"}
          </button>
        </form>
      </div>
    );
  }

  // ── Partner List ──
  if (view === "partners") {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => setView("dashboard")}
            className="mb-8 cursor-pointer text-sm text-muted transition-colors hover:text-accent"
          >
            &larr; Back to Dashboard
          </button>

          <h2 className="mb-6 text-2xl font-bold text-white">
            Players in Your Bracket
          </h2>

          {loadingPartners ? (
            <p className="text-muted">Loading partners...</p>
          ) : partners.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-surface-light px-6 py-10 text-center">
              <p className="text-muted">
                No partners found in your skill bracket yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {partners.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/5 bg-surface-light px-6 py-5"
                >
                  <p className="text-lg font-semibold text-white">
                    {p.full_name}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                      {p.skill_level} — {getSkillTier(p.skill_level)}
                    </span>
                  </div>
                  <a
                    href={buildWhatsAppUrl(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-accent/30 hover:text-accent"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Message on WhatsApp
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Player Dashboard ──
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Welcome Header */}
        <h1 className="mb-8 text-3xl font-bold text-white">
          Welcome back, <span className="text-accent">{player.full_name}</span>
        </h1>

        {/* Skill Level Badge */}
        <div className="mb-6 rounded-2xl border border-accent/10 bg-surface-light p-10 text-center shadow-[0_0_60px_rgba(0,255,135,0.15)]">
          <p className="text-7xl font-bold text-accent">
            {player.skill_level}
          </p>
          <p className="mt-3 text-sm uppercase tracking-wider text-muted">
            {getSkillTier(player.skill_level)}
          </p>
        </div>

        {/* Match Status Card */}
        <div className="mb-6 rounded-xl border border-white/5 bg-surface-light px-6 py-5">
          <p className="text-xs uppercase tracking-wider text-muted">
            Next Evaluation Match
          </p>
          <p className="mt-2 text-lg text-white">
            TBD &mdash; We&apos;ll notify you on WhatsApp
          </p>
        </div>

        {/* Find a Partner Button */}
        <button
          onClick={handleFindPartners}
          disabled={loadingPartners}
          className="w-full cursor-pointer rounded-full bg-accent py-4 text-base font-semibold text-background-deep transition-all duration-200 hover:bg-accent-dim hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] disabled:opacity-50"
        >
          {loadingPartners ? "Finding Partners..." : "Find a Partner"}
        </button>
      </div>
    </div>
  );
}
