# TVK Labs Dev Team — blockchain security toolchain

This is an implementation guide, **not** a claim that scans have run or vulnerabilities have been fixed.

## Official upstream practices checked (2026-10-10)

- **XRPL Foundation / rippled**: https://github.com/XRPLF/rippled/blob/develop/.github/workflows/cargo-audit.yml — Rust `cargo audit`, PR/branch/weekly schedule, failure reports.
- **Ethereum / go-ethereum**: https://github.com/ethereum/go-ethereum/blob/master/.github/dependabot.yml — Go module Dependabot security updates.
- **BNB Chain / BSC**: https://github.com/bnb-chain/bsc/blob/master/.github/workflows/nancy.yml — Sonatype Nancy Go dependency scanner; uses OSS Index credentials.
- **Solana / Anza Agave**: https://github.com/anza-xyz/agave/blob/master/.github/dependabot.yml — daily Rust Cargo and GitHub Actions dependency updates.
- **Cloudflare**: https://github.com/cloudflare/security-audit-skill — source-backed trust-boundary review guidance.

## Integration policy

Apply the relevant tool based on actual repo files, not a blanket install:

- `Cargo.toml` / `Cargo.lock`: `cargo audit`, Dependabot Cargo, and appropriate Rust static analysis.
- `go.mod` / `go.sum`: `govulncheck` and Dependabot Go; Nancy optional with approved credentials and verified binary integrity.
- `package.json` / lockfile: `npm audit --audit-level=high` (or matching package manager), Dependabot npm, and secret/dependency checks.
- `.github/workflows`: Dependabot GitHub Actions; pin action SHAs and minimize permissions.
- EVM/Solidity contracts: dedicated Slither/Foundry static and invariant tests; independent audit before mainnet changes.
- Solana programs: Rust audit plus program-specific authority, account ownership, PDA, signer, and CPI boundary tests.
- XRPL integration: validate destination tags, network/ledger identity, memo/tag binding, replay protection, and confirmed settlement.
- Every chain: transaction idempotency, RPC trust, confirmations/finality, custody, and audit trails.
- Post-quantum: inventory signature schemes and transport cryptography; document migration to standardized hybrid/PQC protocols where supported. No unverified quantum-resistance claims.

Do not execute downloaded scripts or install third-party tools automatically without reviewing provenance, license, pinning, and CI permissions. Do not expose credentials in CI logs.

Maintain **TVK Labs Dev Team** for TVK-authored user-facing labels. Preserve original third-party attribution and API identifiers.
