import OpenAI from "openai";
import { hasOpenAIKey } from "@/lib/openai-embed";

const MODEL = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
const MAX_DOC_CHARS = 60_000;
const MAX_HISTORY = 20;

export { hasOpenAIKey as hasChatOpenAIKey };

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function client(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

export async function runKeeprChat(input: {
  documentTitle?: string | null;
  documentText?: string | null;
  messages: ChatTurn[];
}): Promise<string> {
  const history = input.messages
    .filter((m) => m.content.trim() && (m.role === "user" || m.role === "assistant"))
    .slice(-MAX_HISTORY);

  if (history.length === 0 || history[history.length - 1]?.role !== "user") {
    throw new Error("Send a question to continue");
  }

  const openai = client();
  const title = (input.documentTitle || "").trim() || "Untitled";
  const doc = (input.documentText || "").trim().slice(0, MAX_DOC_CHARS);

  const systemParts = [
    `You are Keepr Chat, a helpful AI assistant in the Keepr reading app sidebar.`,
    `Answer any question the user asks — general knowledge, advice, writing help, coding, brainstorming, etc.`,
    `Be clear and concise (sidebar-friendly: a few paragraphs or bullets unless they ask for more).`,
    `When the open document is relevant, use it and say when you are drawing from it. When it is not relevant, answer normally without forcing the document into the reply.`,
    `If you are unsure, say so. Do not invent document quotes.`,
  ];

  if (doc) {
    systemParts.push(
      `An open document is available for context when helpful.`,
      `Document title: ${title}`,
      `Document text:\n---\n${doc}\n---`
    );
  } else {
    systemParts.push(`No document text is loaded right now; answer from general knowledge.`);
  }

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: systemParts.join("\n\n"),
      },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content.trim().slice(0, 8000),
      })),
    ],
  });

  const reply = res.choices[0]?.message?.content?.trim();
  if (!reply) throw new Error("No reply from the model");
  return reply;
}
