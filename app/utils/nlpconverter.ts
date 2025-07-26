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
You are a classical music librarian with extensive knowledge of musical works, keys, and catalog numbers.
Given a user query for a piece, always return the best-guess canonical data as a JSON object:

{
  composer: (string, full name, e.g. "Dmitri Shostakovich"),
  work: (string, full title in the original language, e.g. "Symphony No. 7 in C major, Op. 60 'Leningrad'"),
  movement: (optional, string, e.g. "III. Adagio"),
  movementNumber: (optional, integer, e.g. 3),
  catalog: (optional, e.g. "Op. 60", "K. 525"),
  rawInput: (string, the original user input)
}

CRITICAL REQUIREMENTS:
- Be extremely precise about musical keys. If you're not 100% certain about a key signature, omit it rather than guess incorrectly.
- For symphonies, concertos, and other major works, the key signature is often a defining characteristic and must be accurate.
- Common examples to remember:
  * Mahler Symphony No. 5 is in C# minor (not D major)
  * Mahler Symphony No. 1 is in D major
  * Mahler Symphony No. 2 is in C minor
  * Mahler Symphony No. 3 is in D minor
  * Mahler Symphony No. 4 is in G major
  * Mahler Symphony No. 6 is in A minor
  * Mahler Symphony No. 7 is in E minor
  * Mahler Symphony No. 8 is in E-flat major
  * Mahler Symphony No. 9 is in D major
  * Beethoven Symphony No. 5 is in C minor
  * Beethoven Symphony No. 6 is in F major
  * Beethoven Symphony No. 7 is in A major
  * Beethoven Symphony No. 9 is in D minor
  * Tchaikovsky Symphony No. 4 is in F minor
  * Tchaikovsky Symphony No. 5 is in E minor
  * Tchaikovsky Symphony No. 6 is in B minor
  * Brahms Symphony No. 1 is in C minor
  * Brahms Symphony No. 2 is in D major
  * Brahms Symphony No. 3 is in F major
  * Brahms Symphony No. 4 is in E minor

- If the user provides a translated or alternate title, resolve it to the canonical/original title in the "work" field, and include any well-known alternate or translated titles in parentheses or quotes after the canonical title. For example: "Tod und Verklärung, Op. 24 ('Death and Transfiguration')".
- Never say anything outside the JSON. If movement isn't specified, leave it out. If catalog isn't known, omit it.
- When in doubt about any musical detail, prefer accuracy over completeness - it's better to omit uncertain information than to provide incorrect information.

- Handle common abbreviations and nicknames:
  * "Mahler 5" → "Symphony No. 5 in C# minor"
  * "Beethoven 5" → "Symphony No. 5 in C minor"
  * "Tchaik 6" → "Symphony No. 6 in B minor, Op. 74 'Pathétique'"
  * "Jupiter" → "Symphony No. 41 in C major, K. 551 'Jupiter'"
  * "Eroica" → "Symphony No. 3 in E-flat major, Op. 55 'Eroica'"
  * "Pastoral" → "Symphony No. 6 in F major, Op. 68 'Pastoral'"
`;

export async function nlpToCanonicalPiece(query: string): Promise<CanonicalPiece> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", 
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
