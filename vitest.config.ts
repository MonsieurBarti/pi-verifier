import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "node_modules",
        "dist",
        "tests/**/*.spec.ts",
        "tests/**/*.test.ts",
        "tests/fixtures/**",
        "tests/mocks/**",
        "src/types.ts",
        "**/*.d.ts",
        "vitest.config.ts",
      ],
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
    environment: "node",
    exclude: ["node_modules", "dist", ".worktrees"],
    globals: true,
    include: ["tests/**/*.spec.ts", "tests/**/*.test.ts"],
  },
});
