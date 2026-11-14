# City-name aliases for AI search — 14 November 2026

User reported “Tìm căn hộ ở thành phố Đà Nẵng dưới 10 triệu” receiving a request
to choose the exact catalog spelling. Read-only application data inspection
found both “Đà Nẵng” and “TP. Đà Nẵng”. AI output validation previously required
exact city strings and public search matched only one stored spelling.

Added PublicCityNames: city-prefix/case/diacritic/punctuation normalization,
canonical value selected only from eligible public catalog, prefixed city text
normalized before AI extraction without changing budget or negation. Original
input/history remains the audit hash source. AI output city normalization precedes
hierarchy validation; district/ward remain grounded and scoped. Prompt addenda
explain equivalent spellings and under10M means9999999.99 VND.

Ordinary and grouped search match all catalog spellings of the same city.
Unknown city retains a restrictive literal predicate, never a nationwide search.
No stored addresses, publication, availability, rights, ownership or account data
were edited; catalog retrieval uses existing public eligibility predicates.

Checks: **38 backend PASS** (AiSearchIntegrationTests8,
DiscoveryRentalIntegrationTests28, PublicCityNamesTests2), dedicated SQL test DB
ancu_auto_rent_20261114. Exact reported sentence is normalized before provider,
canonical output/capability preserve9999999.99; search finds both city spellings,
excludes10M/hidden/occupied, retains district scope, unknown city returns zero,
forged model fields/locations still fail, generic discovery/isolation regressions
pass. Request normalization preserves negation/budget and unknown locations.

**4 Playwright MCP scenarios PASS** at1440/390: reported Đà Nẵng sentence and
original HCM criteria, automatic apply/main-filter sync/chat room preview,
ordinary conversation/history, manual search/reset, provider/apply/preview errors,
no unexpected console/request errors or horizontal overflow. Browser/API fixtures
and mocked AssistanceClient only; live Gemini wording/result quality unverified.
No frontend production code/schema change, new dependency, fixture reset or push.
Context7 Spring Data JPA4.1 docs consulted; existing Specification/criteria query
pattern retained. OwnVite3196 stopped after checks. Three diagnostic files untouched.

ADR/customer-ai-search-v1 and AI/discovery OpenAPI updated. Restart backend to
load the normalization/prompt changes, then repeat the original query.
