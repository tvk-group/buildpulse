---
name: tvk-web3-payments-compliance
description: Security and compliance for Web3 sales, wallets and settlement
---
# Web3 Sale Controls
- Prove wallet ownership via one-use server nonce; treat identity signer and ERC-20 recipient separately.
- Validate asset, payment network, destination address, memo/tag, amounts and tx hash against authoritative server configuration.
- Separate submitted / seen / final / reconciled / allocated / claimable / claimed / vested states; prevent duplicate credit on retries and chain reorgs.
- Enforce server RBAC, database RLS and immutable audit trail. Keep audit and payment details accurate.
- ENK: avoid unapproved Google/password sign-in; Solana signer by itself cannot receive Ethereum ERC-20 allocation. KYC before TGE remains subject to compliance review.
- Security and financial state errors block release until independent test evidence.
