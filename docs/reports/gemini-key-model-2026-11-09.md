# Gemini key/model diagnosis, 09/11/2026

Branch fix/gemini-provider-compatibility from0ca6025.

## Observed

- Live localhost8080 chatbot returned503 AI_PROVIDER_ERROR for the supplied public search phrase.
- Official generateContent using the local key with gemini-2.5-flash returned404 NOT_FOUND and stated it was unavailable to new users, recommending3.8Flash.
- Gemini3.8 with low thinking returned503 UNAVAILABLE/high demand. An earlier request without migration parameters timed out, without a conclusive response.
- Gemini3.5 Flash-Lite returned200 STOP,10filter keys. Initial response incorrectly scaled5millionVND to4.99. Explicit full-VND examples added to search/chat prompts. Retest returned200 STOP in1.197s, maxRent4999999.99 and a valid Vietnamese reply without an already-applied claim.
- Local .env.local updated GEMINI_MODEL to gemini-3.5-flash-lite. Key unchanged and excluded from Git. No private documents or personal data sent, only synthetic/public search text. Provider key not printed or logged.

## Implemented

Shared Gemini3 generation compatibility removes deprecated temperature and uses thinkingLevel low. Existing2.5 budget behavior retained. Gemini3 dossier output ceiling16384. Chat provider failures classified by HTTP status with safe messages, avoiding the generic key/model/request/busy ambiguity. Prompt examples make full VND units explicit.

## Checks and limitations

7unit tests passed, compile/testCompile passed. Covers Gemini3 config, legacy2.5 config,8provider HTTP statuses without exposing provider body/key, plus date report and draft SQL metadata regressions. First test attempt constructed a real Java HttpClient and failed at sandbox loopback selector creation, changed the unit fixture to a mocked client without altering production networking, rerun passed.

Live provider success above used the actual configured chat schema/prompt with API request calls. User IDE/backend remains running its old settings until restarted. Full app success after restart, live dossier extraction and image reading with the new model remain unobserved. No production/private data writes, automatic provider switching or retries introduced. Earlier SQL acceptance gates remain.

Official references. [Gemini3 migration](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.8), [Gemini3.5 Flash-Lite inputs/structured output](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).
