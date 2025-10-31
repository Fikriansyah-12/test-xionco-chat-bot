import OpenAI from "openai";

export const runtime = "nodejs";


const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY belum di-set di .env.local");
}

const baseURL = process.env.OPENAI_BASE_URL || "https://api.deepseek.com";
const client = new OpenAI({ apiKey, baseURL });

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "deepseek-chat";
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || "deepseek-reasoner";

function normalizeBody(body: any): { messages: ChatMsg[]; model: string } {
  const model =
    (typeof body?.model === "string" && body.model.trim()) || DEFAULT_MODEL;

  const asArray = Array.isArray(body?.messages) ? body.messages : [];
  const messages: ChatMsg[] = asArray
    .map((m: any) => ({
      role: m?.role,
      content: typeof m?.content === "string" ? m.content : "",
    }))
    .filter(
      (m: { role: string; content: string | any[]; }) =>
        (m.role === "user" || m.role === "assistant" || m.role === "system") &&
        m.content.length > 0
    );

  if (messages.length === 0) {
    messages.push(
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" }
    );
  }

  // Pangkas riwayat agar hemat token
  const MAX_MESSAGES = 12;
  const trimmed =
    messages.length > MAX_MESSAGES
      ? [messages[0], ...messages.slice(-MAX_MESSAGES)]
      : messages;

  return { messages: trimmed, model };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let { messages, model } = normalizeBody(body);

    const MAX_RETRIES = 3;
    let lastErr: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
        });

        const reply =
          completion.choices[0]?.message ??
          ({ role: "assistant", content: "(tidak ada jawaban)" } as ChatMsg);

        return new Response(JSON.stringify({ reply }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: any) {
        lastErr = err;

        const msg: string =
          (typeof err?.message === "string" && err.message) ||
          "Unknown error";
        const status: number =
          typeof err?.status === "number" ? err.status : 500;

        // Jika rate limit/kuota, lakukan backoff + sekali fallback model
        if (status === 429 || /rate limit|quota/i.test(msg)) {
          if (attempt === 0 && FALLBACK_MODEL && FALLBACK_MODEL !== model) {
            model = FALLBACK_MODEL;
          }
          const delay = 1000 * Math.pow(2, attempt); 
          await sleep(delay);
          continue;
        }

        throw err;
      }
    }

    const m =
      typeof lastErr?.message === "string"
        ? lastErr.message
        : "Rate limit / quota";
    return new Response(
      JSON.stringify({
        error: {
          message: m,
          hint:
            "Kena rate limit/quota DeepSeek. Sudah dicoba retry otomatis. Coba lagi nanti atau ganti model.",
        },
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const message =
      typeof err?.message === "string" ? err.message : "Internal Server Error";
    const status =
      typeof err?.status === "number"
        ? err.status
        : /authentication|unauthorized/i.test(message)
        ? 401
        : 500;

    return new Response(JSON.stringify({ error: { message } }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      error: {
        message: "Gunakan POST ke /api/chat",
        example: { messages: [{ role: "user", content: "Halo!" }] },
      },
    }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}
