import {describe,expect,it} from "vitest";
import {renderBuildPulsePdf} from "./pdf";

describe("BuildPulse PDF archive",()=>{
  it("renders deterministic PDF bytes for an approved-edition payload",()=>{
    const input={subject:"BuildPulse Weekly #1",editionType:"weekly",slug:"weekly-1",revision:3,html:"<h1>Signal</h1><p>AI &amp; blockchain infrastructure.</p>"};
    const a=renderBuildPulsePdf(input),b=renderBuildPulsePdf(input);
    expect(a.subarray(0,8).toString("ascii")).toBe("%PDF-1.4");
    expect(a.equals(b)).toBe(true);
    expect(a.toString("ascii")).toContain("BuildPulse Weekly #1".toUpperCase());
    expect(a.toString("ascii")).toContain("startxref");
  });
  it("fails closed rather than replacing unsupported Unicode glyphs",()=>{expect(()=>renderBuildPulsePdf({subject:"Türkçe",editionType:"daily",slug:"unicode",revision:1,html:"<p>İstanbul</p>"})).toThrow(/embedded Unicode font/)});
  it("does not preserve active HTML in the PDF stream",()=>{
    const pdf=renderBuildPulsePdf({subject:"Safe",editionType:"daily",slug:"safe",revision:1,html:'<script>alert(1)</script><p onclick="x()">Visible</p>'}).toString("ascii");
    expect(pdf).not.toContain("<script");
    expect(pdf).not.toContain("onclick=");
    expect(pdf).toContain("Visible");
  });
});
