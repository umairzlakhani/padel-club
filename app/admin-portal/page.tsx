"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Application {
  id: string;
  full_name: string;
  whatsapp_number: string;
  skill_level: number;
  status: string | null;
  created_at: string;
}

const ADMIN_PASSWORD = "KarachiPadel2026";

export default function AdminPortal() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function fetchApplications() {
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", JSON.stringify(error, null, 2));
    } else {
      setApplications(data ?? []);
    }
    setLoading(false);
  }

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError("");
      fetchApplications();
    } else {
      setPasswordError("Incorrect password.");
    }
  }

  async function handleApprove(id: string) {
    setApprovingId(id);
    const { error } = await supabase
      .from("applications")
      .update({ status: "member" })
      .eq("id", id);

    if (error) {
      console.error("Approve error:", JSON.stringify(error, null, 2));
    } else {
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: "member" } : app))
      );
    }
    setApprovingId(null);
  }

  function buildWhatsAppUrl(app: Application) {
    const number = app.whatsapp_number.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Hi ${app.full_name}, welcome to Padel Club Karachi! We saw your ${app.skill_level} rating—ready for an evaluation?`
    );
    return `https://wa.me/${number}?text=${text}`;
  }

  const totalApplicants = applications.length;
  const pendingReviews = applications.filter(
    (a) => a.status !== "member"
  ).length;

  // ── Password Gate ──
  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-white/5 bg-surface-light p-8"
        >
          <h1 className="mb-1 text-2xl font-bold text-white">Admin Portal</h1>
          <p className="mb-6 text-sm text-muted">
            Enter the admin password to continue.
          </p>

          <label
            htmlFor="adminPassword"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted"
          >
            Password
          </label>
          <input
            id="adminPassword"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mb-4 w-full rounded-lg border border-white/10 bg-background px-4 py-3 text-sm text-white placeholder-muted outline-none transition-colors focus:border-accent/40"
          />

          {passwordError && (
            <p className="mb-4 text-sm text-red-400">{passwordError}</p>
          )}

          <button
            type="submit"
            className="w-full cursor-pointer rounded-full bg-accent py-3 text-sm font-semibold text-background-deep transition-all duration-200 hover:bg-accent-dim hover:shadow-[0_0_30px_rgba(0,255,135,0.3)]"
          >
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <h1 className="mb-8 text-3xl font-bold text-white">
          Admin <span className="text-accent">Dashboard</span>
        </h1>

        {/* Stats Bar */}
        <div className="mb-8 flex gap-4">
          <div className="rounded-xl border border-white/5 bg-surface-light px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Total Applicants
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {totalApplicants}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-surface-light px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Pending Reviews
            </p>
            <p className="mt-1 text-2xl font-bold text-accent">
              {pendingReviews}
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-muted">Loading applications...</p>
        ) : applications.length === 0 ? (
          <p className="text-muted">No applications found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-surface-light">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">WhatsApp</th>
                  <th className="px-6 py-4">Skill Level</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      {app.full_name}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {app.whatsapp_number}
                    </td>
                    <td className="px-6 py-4 text-muted">{app.skill_level}</td>
                    <td className="px-6 py-4">
                      {app.status === "member" ? (
                        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                          Member
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted">
                          {app.status ?? "Pending"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* WhatsApp Button */}
                        <a
                          href={buildWhatsAppUrl(app)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-accent/30 hover:text-accent"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Message
                        </a>

                        {/* Approve Button */}
                        {app.status !== "member" && (
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={approvingId === app.id}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                          >
                            {approvingId === app.id ? (
                              "Approving..."
                            ) : (
                              <>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                                Approve
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
