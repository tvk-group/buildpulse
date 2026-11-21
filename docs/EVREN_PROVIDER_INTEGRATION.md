# EVREN inference provider for BuildPulse AI

**Status:** implementation branch; not production-enabled until credentials, policy and runtime validation are complete.

## Purpose

BuildPulse AI can use the EVREN OpenAI-compatible Chat Completions API as a cloud inference provider. The BuildPulse chat endpoint prefers EVREN by default when its server-side credential is configured, retries one transient HTTP 503, and then falls back to NVIDIA when NVIDIA is configured.

The internal BuildPulse AI gateway also recognises EVREN as a provider for task-based agent workloads. Provider selection remains subject to each task's privacy, cost, latency and budget policy.

## Server-side environment

Configure these only on the Railway `buildpulse` service, never in `NEXT_PUBLIC_*` variables or browser storage:

| Variable | Purpose | Default |
|---|---|---|
| `EVREN_API_KEY` | EVREN bearer credential | Required; no default |
| `EVREN_API_BASE_URL` | OpenAI-compatible API base | `https://evren-llmapi.ssyz.org.tr/v1` |
| `EVREN_API_MODEL` | Default model for the BuildPulse chat | `qwen3.8-flash-next` |
| `EVREN_API_MODELS` | Comma-separated chat model allowlist | Default model only |
| `BUILDPULSE_CHAT_PROVIDER_ORDER` | Chat provider preference order | `evren,nvidia` |
| `BUILDPULSE_AI_PROVIDER_ORDER` | Internal agent provider order | `local,evren,nvidia,openai` |

For the internal gateway, the provider uses `EVREN_API_KEY`, `EVREN_API_BASE_URL` and `EVREN_API_MODEL` as well.

## Privacy and operational controls

- Do not route finance reconciliation or other `local_only` tasks to EVREN.
- `private_preferred` tasks remain local-only by default unless a task-specific `BUILDPULSE_AI_PROVIDER_ORDER_<TASK>` explicitly enables a cloud provider after data classification and policy review.
- Do not send credentials, wallet secrets, private keys, customer records or restricted material to EVREN.
- The chat endpoint uses server-side secrets, bounded input/history, a per-minute request limit and a 60-second upstream timeout.
- EVREN chat requests retry one HTTP 503 before moving to the next configured provider.
- Usage and provider identity should be monitored before enabling broad public traffic.
- EVREN is not an execution authority. Model output remains advisory; privileged operations require existing application authorization and approval controls.

## Activation checklist

1. Add the EVREN credential to Railway's secret store for the `buildpulse` production service.
2. Configure the non-secret model and provider-order variables.
3. Confirm EVREN terms, quota, retention and data-processing requirements for BuildPulse's use case.
4. Run lint, typecheck, unit tests and a controlled inference smoke test.
5. Verify the reported provider/model and fallback behaviour.
6. Enable production traffic only after review and explicit release approval.

No API key is stored in this repository.