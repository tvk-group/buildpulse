import { describe, expect, it } from "vitest";
import { buildPulseEmailInvitation } from "./email-invitation";

describe("BuildPulse email invitation", () => {
  it("is explicitly optional and does not imply subscription", () => {
    const html = buildPulseEmailInvitation();
    expect(html).toContain("OPTIONAL");
    expect(html).toContain("does not subscribe you");
    expect(html).toContain("affirmative choice");
  });

  it("rejects non-https destination overrides", () => {
    expect(buildPulseEmailInvitation("javascript:alert(1)")).not.toContain("javascript:");
  });
});
