"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const SKILL_LEVELS = Array.from({ length: 13 }, (_, i) => (1 + i * 0.5).toFixed(1));

export default function ApplicationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const close = useCallback(() => {
    setIsOpen(false);
    if (isSuccess) {
      setFullName("");
      setWhatsapp("");
      setSkillLevel("");
      setIsSuccess(false);
    }
  }, [isSuccess]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { error: dbError } = await supabase.from("applications").insert({
      full_name: fullName.trim(),
      whatsapp_number: whatsapp.trim(),
      skill_level: parseFloat(skillLevel),
    });

    setIsSubmitting(false);

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      setError("Something went wrong. Please try again.");
      return;
    }

    setIsSuccess(true);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-semibold text-background-deep transition-all duration-200 hover:scale-105 hover:bg-accent-dim hover:shadow-[0_0_30px_rgba(0,255,135,0.3)]"
      >
        Apply for Membership
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl border border-accent/10 bg-surface-light p-8 shadow-[0_0_60px_rgba(0,255,135,0.05)]">
            {/* Close button */}
            <button
              onClick={close}
              className="absolute right-4 top-4 cursor-pointer text-muted transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            {isSuccess ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center gap-6 py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  You&apos;re on the List
                </h2>
                <p className="max-w-xs text-sm leading-relaxed text-muted">
                  Welcome to the elite waitlist. We&apos;ll reach out on
                  WhatsApp once your spot opens up. Only the best make the cut.
                </p>
                <button
                  onClick={close}
                  className="mt-2 cursor-pointer rounded-full border border-accent/20 px-6 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/5"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <h2 className="mb-1 text-2xl font-bold text-white">
                  Apply for Membership
                </h2>
                <p className="mb-6 text-sm text-muted">
                  Join Karachi&apos;s most exclusive Padel network.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted"
                    >
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ahmed Khan"
                      className="w-full rounded-lg border border-white/10 bg-background px-4 py-3 text-sm text-white placeholder-muted outline-none transition-colors focus:border-accent/40"
                    />
                  </div>

                  {/* WhatsApp Number */}
                  <div>
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
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full rounded-lg border border-white/10 bg-background px-4 py-3 text-sm text-white placeholder-muted outline-none transition-colors focus:border-accent/40"
                    />
                  </div>

                  {/* Skill Level */}
                  <div>
                    <label
                      htmlFor="skillLevel"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted"
                    >
                      Skill Level
                    </label>
                    <select
                      id="skillLevel"
                      required
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-white/10 bg-background px-4 py-3 text-sm text-white outline-none transition-colors focus:border-accent/40"
                    >
                      <option value="" disabled>
                        Select your level (1.0 – 7.0)
                      </option>
                      {SKILL_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <p className="text-sm text-red-400">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 cursor-pointer rounded-full bg-accent py-3.5 text-sm font-semibold text-background-deep transition-all duration-200 hover:bg-accent-dim hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
