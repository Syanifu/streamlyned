import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.OPENAI_API_KEY || "";
  const hasKey = key.length > 0;
  const keyPreview = hasKey ? `${key.slice(0, 7)}...${key.slice(-4)}` : "not set";

  let apiWorking = false;
  let apiError = "";

  if (hasKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: key });
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      });
      apiWorking = !!res.choices[0]?.message?.content;
    } catch (e: any) {
      apiError = e.message;
    }
  }

  const gclientId = process.env.GOOGLE_CLIENT_ID || "";
  const gclientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return NextResponse.json({
    hasKey, keyPreview, apiWorking, apiError,
    google: {
      clientIdSet: gclientId.length > 0,
      clientIdPreview: gclientId.length > 0 ? `${gclientId.slice(0, 8)}...` : "NOT SET",
      clientSecretSet: gclientSecret.length > 0,
      siteUrl,
    },
  });
}
