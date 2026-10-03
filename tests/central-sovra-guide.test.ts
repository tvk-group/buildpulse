import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("central SOVRA guide contract", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");

  it("loads the canonical shared SOVRA Network advisor", () => {
    expect(layout).toContain('id="sovra-ai-advisor-loader"');
    expect(layout).toContain('src="https://www.sovra.network/assets/sovra-advisor.js"');
    expect(layout).toContain('data-api="https://www.sovra.network/api/advisor"');
    expect(layout).toContain('data-site="BuildPulse"');
  });

  it("does not mount the obsolete local guide fork", () => {
    expect(layout).not.toContain("SovraPageGuide");
    expect(layout.match(/sovra-ai-advisor-loader/g)?.length).toBe(1);
  });
});
