export async function POST(req) {
  try {
    const body = await req.json();
    const { question, deterministic, snapshot, systemPrompt } = body || {};

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { ok: false, error: "Missing OPENAI_API_KEY on Vercel." },
        { status: 500 }
      );
    }

    const inputText = [
      "USER QUESTION:",
      question || "",
      "",
      "DIRECT DATA ANSWER:",
      deterministic || "None",
      "",
      "TMS SNAPSHOT:",
      typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot || {}, null, 2),
      "",
      "TASK:",
      "Answer only about TMS, dispatch, drivers, trailers, trucks, loads, utilization, operational efficiency, customer coverage, and logistics operations.",
      "If the deterministic answer already fully answers the question, keep the same facts and improve readability only.",
      "If broader reasoning is needed, use the snapshot and reason carefully.",
      "Never invent exact counts, names, or facts not supported by the provided data.",
      "Never confuse BREAK with BREAKDOWN.",
      "Start the final answer with exactly: AI Assistant engaging..."
    ].join("\n");

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-nano",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: systemPrompt || "You are FreightPilot TMS AI Assist."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: inputText
              }
            ]
          }
        ],
        max_output_tokens: 500
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return Response.json(
        { ok: false, error: data?.error?.message || "OpenAI request failed.", raw: data },
        { status: resp.status }
      );
    }

    const text =
      data?.output_text ||
      (Array.isArray(data?.output)
        ? data.output
            .flatMap(item => Array.isArray(item.content) ? item.content : [])
            .map(part => part?.text || "")
            .join("\n")
            .trim()
        : "");

    return Response.json({
      ok: true,
      answer: text || "AI Assistant engaging...\n\nNo text returned."
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
