# LexChamber AI assistant — private pilot

Implemented 29 October 2026. This is the foundation for a future **Pro with AI** package. The public LexChamber subscription and its price are unchanged; no AI package is marketed or sold yet.

## Access

- Clerk verifies the primary account email on every request.
- `AI_PILOT_EMAILS` is a server-only comma-separated grant. No default grant; regular subscribers, trial users and secretaries are denied.
- The account must have an active paid subscription. An owner/admin flag does not grant AI access.
- The pilot does not make its user a platform owner. The menu link appears only after the server reports AI access; protected assets and APIs enforce the same grant directly.
- Revoke by clearing the allowlist and redeploying. Nothing is written to the financial backend by this feature.

## Routes

- `GET /assistant`: authenticated workspace.
- `GET /api/ai/config`: access-checked profiles, limits and configured provider indicators. No keys or full system prompts are returned.
- `POST /api/ai/generate`: same-origin, authenticated generation with bounded input, exact specialist/task selection and safe-material acknowledgement.
- Documents: browser extraction of text PDFs (up to 100 pages), DOCX, TXT and MD. Eight documents, 5 MB each; 80,000 characters per document, 140,000 total. There is no silent truncation, no OCR and no automatic bundle-page mapping. Users must check text and images omitted from text extraction.
- The server creates D1…D8 document IDs. PDF extraction adds physical PDF page markers. DOCX/TXT paragraphs are extraction references, not original pagination.
- Tasks: record analysis, drafting papers, preparation, and research plans / supplied-authority analysis. No live search, URL fetch, external tools, automatic authority verification, filing or emailing.
- Output: a conversational response, source register, provider/model metadata, partial-output warning, copy and TXT download. Follow-up requests include only the current conversation; a new chat starts a separate context. See the conversational update below.

## Provider setup — secrets stay in hosting

Use Sites hosting environment variables; deploy the saved version after changing them. Never commit keys, put them in browser code, paste them into document prompts or expose them in screenshots.

| Variable | Purpose |
| --- | --- |
| `AI_PILOT_EMAILS` | Only the verified pilot account email; stored as a secret. |
| `GEMINI_API_KEY` | Optional secret from Google AI Studio API keys. |
| `GEMINI_MODEL` | Optional model ID; current default `gemini-3.5-flash-lite`. Confirm that your project has a free allowance before use. |
| `OPENROUTER_API_KEY` | Optional secret from OpenRouter API keys. |
| `OPENROUTER_FREE_MODEL` | Optional catalog model ending in `:free`; invalid/paid IDs resolve to `openrouter/free`. |

One configured provider is sufficient. Without a key, extraction/review works but generation is disabled with an explicit setup message. Configuration presence does not verify key validity, credit/quota or model access.

Auto mode tries Gemini first, then OpenRouter only for capacity/rate-limit/model-unavailable/timeouts. Selecting a single provider forbids cross-provider fallback. Safety refusals and invalid keys are not bypassed. Requests time out after 25 seconds per provider; there are no background retries or paid-model escalation.

OpenRouter uses only `openrouter/free` or an explicit `:free` model, `data_collection: deny`, `zdr: true` and zero maximum prompt/completion/request/image price. If no matching endpoint exists, the request fails; the restrictions are not relaxed. This can mean no free route is available. Configure account privacy controls too; request filters are not a blanket confidentiality guarantee.

**Gemini free use depends on the Google project.** The generation API has no per-request free-only switch. Use a project without active billing if free-quota-only use is intended. Do not enable billing as part of this pilot without a separate decision. Models, free quotas and terms can change.

## Confidentiality and persistence

The unpaid Gemini terms explicitly say not to send sensitive, confidential or personal information. Therefore this pilot requires public, synthetic or properly anonymised material, including filenames, instructions and matter labels. It is not approved for privileged live client documents. For confidential live records, first select suitable contractual data-processing arrangements, retention and region controls, then implement and assess that separate mode.

LexChamber holds original files/extracted text and drafts in tab memory, processes the submitted text transiently in its Worker, and intentionally stores neither in Google Sheets, browser storage, a database nor application logs. Document upload itself is local extraction; clicking Prepare draft transmits displayed text and task metadata to hosting and the selected provider(s). Provider/hosting processing and retention remain governed by their terms. Clearing the workspace cannot delete provider records. No financial records are attached automatically. Export drafts before leaving.

Source prompts are adapted from the user's connected Commercial and Contract v1.2, Research v1.2, Family Law v1.5, Property Law and Civil Procedure instruction skills. No client matters, chats or GPT knowledge files were copied. The full uploaded Universal Legal Protocol and knowledge collections were not available. An overriding instruction states no live-source verification tools are present, so profiles cannot truthfully claim live verification. Profiles and specialist prompts live server-side in `worker/ai-profiles.js`; documents are untrusted evidence rather than executable instructions.

Per-isolate in-flight and minute limits provide backpressure, not a durable global quota. Before opening paid AI subscriptions generally, add durable quotas/usage metering, abuse controls, matter storage and retention, large-record retrieval with coverage reporting, OCR, secure export, primary-source retrieval and authority-verification evaluation. No production generation test was performed without provider keys.

## Primary implementation references checked 29 October 2026

- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/terms
- https://ai.google.dev/gemini-api/docs/pricing
- https://openrouter.ai/docs/guides/routing/model-variants/free
- https://openrouter.ai/docs/guides/routing/provider-selection

Tests mock upstream APIs. They verify server access grants, subscription/secretary restrictions, origin validation, bounded bodies/context, no key disclosure, provider payloads, controlled free fallback, safety refusals, unavailable keys and partial outputs. They do not certify legal accuracy or live provider availability.

## Conversational interface update — 29 October 2026

Replaced the initial task form with a chat interface: new conversations, a sidebar of chats held in this tab, user/assistant message thread, follow-up messages, starter prompts, document attachment/review dialog, optional specialist/matter settings, response copy/download and conversation export. Public pricing is unchanged. Chats are not persisted; reloading or closing loses them. The current conversation only is sent on each turn. The server accepts at most 20 prior alternating user/assistant messages, 100,000 history characters, and 220,000 combined document/history/current-instruction characters; the bounded request reader still applies. There is no silent history trimming. Prior assistant turns are explicitly treated as unverified drafts, not evidence or authority.

Source documents become read-only once used in a successful response so D1/D2 references stay stable. Additional documents can be appended. Use a new conversation to replace existing sources or change specialist/matter particulars. Conversations are isolated in memory.

Voice input now supports microphone recording (up to 90 seconds; MIME capability detection for WebM/MP4/OGG) and uploading an audio note smaller than 4 MB. Recording stops on app backgrounding, page exit, explicit stop or the time limit. Tracks are released after capture. Audio remains in tab memory until the user explicitly confirms the content restriction and chooses Transcribe. `POST /api/ai/transcribe` enforces the same allowlist, active-paid access and same-origin requirement, validates MIME/base64 and a bounded body, calls Gemini only, and rejects partial or blocked transcripts. The transcript is inserted into the composer for review, never sent to conversation generation automatically. It requires `GEMINI_API_KEY`; OpenRouter-only configuration does not enable transcription. This is not real-time two-way voice, and audio output is not provided. Native iPhone keyboard dictation can also fill the message field.

Provider keys are still required for real AI generation/transcription. Local browser QA uses a temporary synthetic identity and mock provider only; that fixture is restored before publication. Tests cover both provider conversation role mappings, context validation, transcription payloads/partial responses and private voice endpoint access. No real user audio is recorded or sent during QA.

Audio reference: https://ai.google.dev/gemini-api/docs/generate-content/audio
