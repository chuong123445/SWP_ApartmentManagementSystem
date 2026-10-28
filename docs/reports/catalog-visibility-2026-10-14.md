# Customer catalog investigation, 14 October 2026

Read-only SQL audit of the actual working database found **13 apartments**, including the newly created C.999; older handoffs reporting 12 are historical snapshots.

| Apartments | Count | Actual state | Public search |
|---|---:|---|---|
| A.102, B.101 | 2 | VACANT, PUBLISHED, APPROVED property and eligible Owner | Included |
| A.101, A.201, A.202, B.201, B.202 | 5 | CONTRACT_IN_PROGRESS, each has exactly one ACCEPTED request | Excluded |
| T.101, T.102 | 2 | OCCUPIED, each has an ACTIVE contract | Excluded |
| B.301 | 1 | VACANT but DRAFT publication | Excluded |
| P.303, P.999 | 2 | VACANT/DRAFT publication, property PENDING_APPROVAL | Excluded |
| C.999 | 1 | VACANT/DRAFT publication, property DRAFT | Excluded |

`ApartmentService.search` applies VACANT, publication, property approval and Owner gates before database pagination/count. `ApartmentRepository.addressOptions` applies the same gates to available addresses. Direct public details remain viewable for published occupied/in-progress apartments, as required for history. Customer and guest use the same public catalog; the Home page has no role-specific two-item cap and uses six items per page.

The two results are correct for this data and the previously confirmed rule “only vacant apartments in search”. CONTRACT_IN_PROGRESS does not mean OCCUPIED, but Owner has already selected a customer, so it must be excluded too. There is no authorized release/cancellation policy for that stage; changing it to VACANT would contradict actual accepted requests. Unpublished apartments must be deliberately published by their Owner after property approval. This task does not reset availability, erase accepted requests, approve properties or auto-publish private drafts.

Backend regression and browser results are recorded in WORK_PROGRESS.md. Browser assertions compare the live API results with rendered cards and counts rather than hardcoding a demo count.
