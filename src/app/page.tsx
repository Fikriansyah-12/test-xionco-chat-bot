"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatMsg = { role: "user" | "assistant"; content: string; at?: number };

export default function Page() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Selamat datang! 👋",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const next = [...messages, { role: "user", content: text, at: Date.now() } as ChatMsg];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages((cur) => [...cur, { ...(data.reply as ChatMsg), at: Date.now() }]);
    } catch (e: any) {
      setMessages((cur) => [
        ...cur,
        { role: "assistant", content: `⚠️ Error: ${e?.message || e}`, at: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const ts = (n?: number) =>
    n ? new Date(n).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="h-screen w-screen overflow-hidden bg-[radial-gradient(1200px_600px_at_20%_-10%,#c7d2fe_0%,transparent_60%),radial-gradient(1200px_600px_at_120%_10%,#bfdbfe_0%,transparent_50%),linear-gradient(to_bottom,#0b0f19,#0b0f19)] text-white">
      {/* HEADER: fixed height */}
      <header className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <div className="grid size-10 place-items-center rounded-2xl bg-white/90 text-neutral-900 shadow">AI</div>
        <div className="leading-tight">
          <h1 className="text-lg font-semibold sm:text-xl">Chatbot Next.js</h1>
          <p className="text-xs text-white/70">Test V.0</p>
        </div>
      </header>

      {/* MAIN: chat window fills the rest */}
      <main className="flex h-[calc(100vh-4rem)] flex-col px-2 sm:px-4 pb-[env(safe-area-inset-bottom)]">
        <section className="relative flex grow flex-col overflow-hidden rounded-[28px] border border-white/25 bg-white/10 p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/15">
          {/* glow */}
          <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-b-full bg-gradient-to-b from-white/40 to-transparent blur-2xl" />

          {/* MESSAGES VIEWPORT (fills available space) */}
          <div
            ref={viewportRef}
            className="relative z-[1] flex-1 space-y-4 overflow-y-auto p-3 sm:p-5"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex max-w-[88%] items-end gap-2">
                  {m.role === "assistant" && (
                    <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/90 text-[11px] font-bold text-neutral-900 shadow">
                      AI
                    </div>
                  )}
                  <div
                    className={
                      m.role === "user"
                        ? "rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 px-4 py-2 text-[15px] leading-relaxed text-white shadow-lg ring-1 ring-white/20"
                        : "rounded-2xl bg-white/90 px-4 py-2 text-[15px] leading-relaxed text-neutral-900 shadow ring-1 ring-black/5"
                    }
                  >
                    {m.content}
                  </div>
                  <span className="select-none text-[10px] text-white/70 drop-shadow">{ts(m.at)}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/90 px-4 py-2 text-sm text-neutral-700 shadow ring-1 ring-black/5">
                  Mengetik…
                </div>
              </div>
            )}
          </div>

          {/* INPUT BAR: sticks to bottom of card */}
          <div className="relative z-[2] border-t border-white/20 bg-white/5 p-2 backdrop-blur-xl">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Tulis pesan… (Enter kirim, Shift+Enter baris baru)"
                rows={1}
                className="max-h-40 w-full resize-none rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-[15px] text-neutral-900 outline-none ring-1 ring-black/5 placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={send}
                disabled={!canSend}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-lg ring-1 ring-white/30 transition active:translate-y-[1px] disabled:opacity-60"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.31 2.05a.75.75 0 0 0-.91.91l3.19 10.4c.05.16.12.32.22.45l5.52 7.32c.46.61 1.43.38 1.56-.37l1.03-6.02c.03-.2.13-.39.28-.53l4.26-4.26c.69-.69.2-1.88-.77-1.88H9.75a.75.75 0 0 1-.75-.75V2.82c0-.97-1.19-1.46-1.88-.77L2.31 2.05Z" />
                </svg>
                Kirim
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
