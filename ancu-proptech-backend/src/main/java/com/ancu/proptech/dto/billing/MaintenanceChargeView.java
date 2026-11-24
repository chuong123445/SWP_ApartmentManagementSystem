package com.ancu.proptech.dto.billing;

/** Immutable repair item shown in previews and stored on the invoice. */
public record MaintenanceChargeView(String ticketId, String title, String period,
        String actualCost, String ownerCost, String customerCost) {}
