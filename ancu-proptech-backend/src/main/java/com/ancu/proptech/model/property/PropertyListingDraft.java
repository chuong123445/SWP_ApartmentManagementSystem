package com.ancu.proptech.model.property;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** Private wizard state. JSON is never trusted as a command or exposed publicly. */
@Entity @Table(name="property_listing_drafts") @Getter @Setter @NoArgsConstructor
public class PropertyListingDraft {
    @Id private Long propertyId;
    @Column(nullable=false,length=36,unique=true) private String requestKey;
    @Column(nullable=false) private Long accountId;
    @Column(nullable=false,columnDefinition="nvarchar(max)") private String payload;
    @Column(nullable=false) private boolean completed;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant updatedAt;
    @Version private long version;
}
