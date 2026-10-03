import {afterEach,describe,expect,it} from "vitest";
import {
  buildPulseInvoiceIssuer,
  configuredCryptoRails,
  getCryptoRail,
  invoiceNumberForOrder,
  quoteAmount,
} from "./payments";

const paymentEnvKeys=[
  "BUILDPULSE_ETH_ADDRESS",
  "BUILDPULSE_ETH_BASE_ADDRESS",
  "BUILDPULSE_BTC_ADDRESS",
  "BUILDPULSE_USDC_ETH_ADDRESS",
  "BUILDPULSE_USDC_BASE_ADDRESS",
  "BUILDPULSE_USDT_ETH_ADDRESS",
  "BUILDPULSE_USDT_BASE_ADDRESS",
  "BUILDPULSE_XRP_ADDRESS",
  "BUILDPULSE_XRP_DESTINATION_TAG",
] as const;

const originalEnv=Object.fromEntries(paymentEnvKeys.map(key=>[key,process.env[key]]));

afterEach(()=>{
  for(const key of paymentEnvKeys){
    const value=originalEnv[key];
    if(value===undefined)delete process.env[key];
    else process.env[key]=value;
  }
});

describe("BuildPulse billing invariants",()=>{
  it("keeps the legal invoice issuer stable",()=>{
    expect(buildPulseInvoiceIssuer).toEqual({
      name:"TVK LABS & TECHNOLOGIES LTD",
      companyNumber:"16481808",
      registeredOffice:"Office 23, Unit 5, 399-405 Oxford Street, London, United Kingdom, W1C 2BU",
    });
  });

  it("creates deterministic invoice references",()=>{
    expect(invoiceNumberForOrder("12345678-1234-1234-1234-123456789abc","2026-10-03T12:00:00Z"))
      .toBe("BP-2026-123456781234");
  });

  it("rounds crypto quotes upward so an invoice is never underquoted",()=>{
    expect(quoteAmount(149,60_000,8)).toBe(0.00248334);
    expect(quoteAmount(19,2.5,6)).toBe(7.6);
  });

  it("advertises only configured and verified settlement rails",()=>{
    process.env.BUILDPULSE_ETH_ADDRESS="0x1111111111111111111111111111111111111111";
    process.env.BUILDPULSE_ETH_BASE_ADDRESS="0x2222222222222222222222222222222222222222";
    process.env.BUILDPULSE_BTC_ADDRESS="bc1qbuildpulse";
    process.env.BUILDPULSE_USDC_ETH_ADDRESS="0x3333333333333333333333333333333333333333";
    process.env.BUILDPULSE_USDC_BASE_ADDRESS="0x4444444444444444444444444444444444444444";
    process.env.BUILDPULSE_USDT_ETH_ADDRESS="0x5555555555555555555555555555555555555555";
    process.env.BUILDPULSE_USDT_BASE_ADDRESS="0x6666666666666666666666666666666666666666";
    process.env.BUILDPULSE_XRP_ADDRESS="rBuildPulse";
    process.env.BUILDPULSE_XRP_DESTINATION_TAG="12345";

    const rails=configuredCryptoRails();
    expect(rails.map(rail=>`${rail.asset}:${rail.network}`)).toEqual([
      "ETH:Ethereum",
      "ETH:Base",
      "BTC:Bitcoin",
      "USDC:Ethereum",
      "USDC:Base",
      "USDT:Ethereum",
      "XRP:XRPL",
    ]);
    expect(rails.some(rail=>rail.asset==="USDT"&&rail.network==="Base")).toBe(false);
    expect(getCryptoRail("XRP","XRPL")?.memo).toBe("12345");
    expect(getCryptoRail("ETH")).toBeUndefined();
  });
});
