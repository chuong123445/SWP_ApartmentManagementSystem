package com.ancu.proptech.model.billing;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** Append-only application audit; no update/delete endpoint is exposed. */
@Entity @Table(name="invoice_events") @Getter @Setter @NoArgsConstructor
public class InvoiceEvent {
    public enum Action { CREATED, UPDATED, CANCELLED, SENT }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,updatable=false) private Long invoiceId;
    @Column(nullable=false,updatable=false) private Long actorId;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=16,updatable=false) private Action action;
    @Column(nullable=false,columnDefinition="datetime2(6)",updatable=false) private Instant occurredAt;
    @Column(length=1000,columnDefinition="nvarchar(1000)",updatable=false) private String reason;
    @Column(columnDefinition="nvarchar(max)",updatable=false) private String beforeJson;
    @Column(nullable=false,columnDefinition="nvarchar(max)",updatable=false) private String afterJson;
}
