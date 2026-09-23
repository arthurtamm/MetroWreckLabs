// This project has no @types/node dependency. mapColors.test.ts needs a
// couple of Node builtins (to read tokens.css from disk in a Vitest/Node
// environment), so declare just the pieces it uses rather than pulling in
// the full @types/node package.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: string): string
}

declare module 'node:url' {
  export function fileURLToPath(url: URL): string
  export class URL {
    constructor(input: string, base?: string | URL)
  }
}
