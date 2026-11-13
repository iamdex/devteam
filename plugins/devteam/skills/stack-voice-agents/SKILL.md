---
name: stack-voice-agents
description: DevTeam conventions for AI voice agents — ElevenLabs (ElevenAgents platform, text-to-speech, speech-to-text), telephony (Twilio/SIP), Claude as the agent's LLM, latency budgets, conversation design, tools/webhooks, multi-tenant configuration, recordings and GDPR. Use when building, debugging or reviewing a voice agent such as an AI receptionist.
---

# Voice agent conventions

ElevenLabs ships changes often. Before using an API, model id, SDK method or setting, check the docs: `https://elevenlabs.io/docs/llms.txt` (index; append `.md` to any docs page URL for markdown) and the changelog. The conversational product is called **ElevenAgents** in current docs (formerly Conversational AI / Agents Platform; API paths still use `/v1/convai/...`). Project conventions in CLAUDE.md win.

## Architecture choices (decide explicitly, write it down)
- **Managed agent** (ElevenAgents handles STT → LLM → TTS, turn-taking, telephony integration) vs **own pipeline** (your backend orchestrates STT, Claude and TTS streams). Default to managed for speed; go custom only for a stated reason (control, cost, latency, data residency).
- **LLM:** a natively integrated model or a custom LLM endpoint (your backend proxying Claude) when you need your own tools, RAG and logging. Keep the system prompt and tool definitions versioned in the repo, not only in a dashboard.
- **Telephony:** native Twilio integration or SIP trunk; one phone number per tenant mapped to an agent (or one agent with per-tenant overrides/dynamic variables).

## Latency budget (per turn)
- Target end-of-user-speech → first audio under ~1 s. Measure each hop: VAD/turn detection, STT, LLM time-to-first-token, TTS time-to-first-byte, network.
- Stream everything; short system prompts; small fast model for the conversational loop; heavy work in tools that return quickly (or say "un attimo che controllo" while a tool runs).
- Tools must be fast (< 1–2 s), idempotent and return compact results the LLM can read aloud.

## Conversation design
- Persona, greeting and closing written for speech: short sentences, no lists, numbers and dates spoken naturally ("martedì 14 alle tre e mezza").
- Explicit flows for the main jobs (e.g. book, move, cancel an appointment), confirmations before committing, graceful fallbacks ("non ho capito, può ripetere?"), and **handoff to a human** (transfer or callback) with the reason.
- Guardrails: stay in scope, never invent availability or prices (always via tools), don't read back sensitive data, resist prompt injection from callers.
- Language and voice: Italian voices tested with real names, addresses and local accents; pronunciation dictionary for brand names.

## Multi-tenant
- Per-tenant config (opening hours, services, prices, staff, voice, greeting) in your DB; injected via dynamic variables/overrides or fetched by tools — never hardcoded per agent.
- Tools authenticate the tenant server-side (signed webhooks / per-tenant secrets); a call for tenant A can never read tenant B's data.

## Webhooks & events
- Verify webhook signatures (HMAC) and timestamps; respond fast, process asynchronously; idempotent handlers keyed by conversation/call id.
- Store conversation id, tenant, outcome, duration, cost; post-call summaries/data collection into your DB.

## Privacy & compliance (EU/Italy)
- Inform callers that they're speaking with an AI and if the call is recorded; configure retention for transcripts/audio; use EU data residency when available and required; DPA with providers; minimize PII in prompts and logs.

## Testing & monitoring
- Scripted test conversations for each flow (happy path, interruptions, silence, background noise, wrong info, abusive caller), automated where the platform supports tests/evals.
- Dashboards: containment rate (resolved without human), transfer rate, average latency, cost per call/minute, error rate per tool.
