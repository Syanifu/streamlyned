/**
 * Bionic reading: bold the first ~half of each word so the eye anchors faster.
 * Returns an array of { bold, rest } segments, one per word, with whitespace preserved.
 */
export interface BionicWord {
  bold: string;
  rest: string;
  space: string; // trailing whitespace after this token
}

function splitPoint(word: string): number {
  if (word.length <= 1) return 1;
  if (word.length <= 3) return 1;
  return Math.ceil(word.length / 2);
}

/**
 * Tokenize a line of text into BionicWord segments.
 * Punctuation attached to the end of a word stays in `rest`.
 */
export function tokenizeLine(line: string): BionicWord[] {
  // Match: word characters (including apostrophes in contractions), trailing space
  const tokenRe = /([^\s]+)(\s*)/g;
  const tokens: BionicWord[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(line)) !== null) {
    const raw = match[1];
    const space = match[2];

    // Strip leading/trailing punctuation to find the "word core"
    const leadingPunct = raw.match(/^[^a-zA-Z0-9]*/)?.[0] ?? "";
    const trailingPunct = raw.match(/[^a-zA-Z0-9]*$/)?.[0] ?? "";
    const core = raw.slice(leadingPunct.length, raw.length - trailingPunct.length);

    if (!core) {
      // Entirely punctuation — treat as non-word
      tokens.push({ bold: raw, rest: "", space });
    } else {
      const n = splitPoint(core);
      tokens.push({
        bold: leadingPunct + core.slice(0, n),
        rest: core.slice(n) + trailingPunct,
        space,
      });
    }
  }

  return tokens;
}
