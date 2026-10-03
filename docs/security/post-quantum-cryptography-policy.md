# BuildPulse Cryptographic Agility & Post-Quantum Security Policy

Status: engineering policy / migration target. This document does not claim the currently deployed system is fully post-quantum secure.

## Objectives
1. Crypto agility: algorithms, parameter sets and key versions must be replaceable without destructive data migration.
2. Hybrid transition: where platform/runtime support exists, combine established classical security with standardized post-quantum mechanisms during migration.
3. No custom cryptography: use maintained, independently reviewed implementations of standardized protocols.
4. Minimize harvest-now-decrypt-later exposure for private communications and long-lived sensitive data.
5. Separate cryptographic purposes: hashing, password derivation, authenticated encryption, key establishment and signatures are not interchangeable.

## Approved target primitives
- Key establishment / KEM: NIST FIPS 203 ML-KEM. Prefer ML-KEM-768 as the general target unless a threat/performance assessment requires another standardized parameter set.
- Digital signatures: NIST FIPS 204 ML-DSA. SLH-DSA (FIPS 205) may be used where its different construction is operationally appropriate.
- Symmetric authenticated encryption: AES-256-GCM where supported and correctly nonce-managed; protocol-approved ChaCha20-Poly1305 may remain where required by an audited messaging protocol.
- Hash/KDF families: SHA-384/SHA-512, SHA-3/SHAKE256 or protocol-specified modern KDFs as appropriate. SHA-256 is NOT globally prohibited: compatibility hashes, content addressing and existing protocols may legitimately require it.
- Passwords: memory-hard password hashing via platform-supported Argon2id where available; otherwise a reviewed password-auth provider. Never use a raw SHA family as a password hash.

## BuildPulse Social / Chat
- Never invent an E2EE protocol.
- Message plaintext must be encrypted client-side before persistence.
- Server message records contain ciphertext and protocol metadata, not plaintext.
- Device identity, pre-key, session and group-key design must be based on a mature audited messaging protocol.
- PQ migration must support versioned device keys and algorithm negotiation without silent downgrade.
- Long-lived identity and backup/export formats must be crypto-agile.
- Metadata minimization remains necessary: E2EE does not hide all metadata.
- Agent/robot accounts use separately scoped keys and controller authorization; human identity keys must not be shared with automated agents.

## Web/API/Infrastructure
- TLS configuration is controlled partly by hosting/CDN/runtime providers. Enable provider-supported hybrid PQ TLS when stable and available; do not claim it where provider/runtime evidence is absent.
- Service-to-service credentials must be short-lived where possible and rotated.
- Secrets belong in managed secret stores, never source control or browser bundles.
- Administrative access requires MFA/passkeys and least privilege.
- Signed webhooks retain provider-required algorithms; do not replace a provider signature scheme unilaterally.
- Database backups and object storage require encryption at rest plus key rotation; sensitive application payloads may additionally require envelope encryption.

## Integrity and publication
- Use versioned content digests and signatures.
- New high-value archival integrity records should be capable of SHA-384/SHA-512/SHA-3 family digests plus a version identifier.
- Existing SHA-256 identifiers are not evidence of a vulnerability and must not be silently changed where they are protocol identifiers.

## Release gates before the words “post-quantum secure” may be used publicly
- cryptographic inventory completed;
- threat model documented;
- PQ/hybrid implementation deployed in the relevant transport or E2EE layer;
- downgrade behavior tested;
- key rotation/recovery tested;
- dependency/SBOM review completed;
- independent cryptographic/security review completed;
- deployment configuration verified, not merely source-code intent.

## Immediate inventory targets
TLS/CDN; Supabase auth/session tokens; password/passkey flows; social E2EE device/session keys; API credentials; Stripe webhook verification; crypto-payment verification; email transport; object storage; backups; publication/archive digests; admin authentication; CI/CD signing and secrets.
