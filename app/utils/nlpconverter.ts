import OpenAI from "openai";

export type CanonicalPiece = {
  composer: string;
  work: string;
  movement?: string;
  movementNumber?: number;
  catalog?: string;
  rawInput: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `
You are a classical music librarian. 
Given a user query for a piece, always return the best-guess canonical data as a JSON object:

{
  composer: (string, full name, e.g. "Dmitri Shostakovich"),
  work: (string, full title, e.g. "Symphony No. 7 in C major, Op. 60 'Leningrad'"),
  movement: (optional, string, e.g. "III. Adagio"),
  movementNumber: (optional, integer, e.g. 3),
  catalog: (optional, e.g. "Op. 60", "K. 525"),
  rawInput: (string, the original user input)
}

Never say anything outside the JSON. If movement isn't specified, leave it out. If catalog isn't known, omit it.
`;

export async function nlpToCanonicalPiece(query: string): Promise<CanonicalPiece> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-nano", 
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query }
    ],
    max_tokens: 300,
    temperature: 0.1,
  });

  // Find the first JSON block in the AI output (should be the only thing returned)
  const output = completion.choices[0].message.content;
  if (!output) {
    throw new Error("OpenAI did not return a response.");
  }
  const match = output.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("OpenAI did not return a valid canonical object.");
  }
  const canonical: CanonicalPiece = JSON.parse(match[0]);
  return canonical;
}
