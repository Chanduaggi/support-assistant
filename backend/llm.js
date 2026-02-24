const Groq = require("groq-sdk");

const docs = require('./docs.json');

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

function buildDocsContext() {
  return docs.map((doc, i) => `[${i + 1}] ${doc.title}:\n${doc.content}`).join('\n\n');
}

function buildSystemPrompt() {
  return `You are a helpful customer support assistant. You MUST answer questions ONLY using the provided documentation below. 

STRICT RULES:
1. Only answer based on the documentation provided. Do not use any external knowledge.
2. If the user's question cannot be answered from the documentation, respond EXACTLY with: "Sorry, I don't have information about that."
3. Do not guess, hallucinate, or extrapolate beyond what is written in the docs.
4. Be concise, friendly, and helpful.
5. If partially relevant info exists, share what you know and note limitations.

=== PRODUCT DOCUMENTATION ===

${buildDocsContext()}

=== END OF DOCUMENTATION ===

Remember: Only answer from the documentation above. If unsure, say "Sorry, I don't have information about that."`;
}

async function chat(messages, userMessage) {
  const systemPrompt = buildSystemPrompt();

  // Last 10 messages history
  const history = messages.slice(-10).map(m => ({
    role: m.role,
    content: m.content
  }));

  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage }
    ],
  });

  const reply =
    completion.choices?.[0]?.message?.content ||
    "Sorry, I don't have information about that.";

  const tokensUsed = completion.usage?.total_tokens || 0;

  return { reply, tokensUsed };
}

module.exports = { chat };