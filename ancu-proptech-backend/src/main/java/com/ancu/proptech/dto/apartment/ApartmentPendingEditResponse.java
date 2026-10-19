package com.ancu.proptech.dto.apartment;

import java.time.Instant;

/**
 * Snapshot of the pending sensitive-field edit for an apartment.
 * All fields are nullable — a null value means the pending edit does not override that field.
 */
public record ApartmentPendingEditResponse(
        String advertisedMonthlyRent,
        String deposit,
        Integer electricityIndex,
        Integer waterIndex,
        String areaM2,
        Instant requestedAt) {}
