import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${root}/` },
      { find: /^server-only$/, replacement: `${root}/tests/stubs/server-only.ts` },
    ],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
