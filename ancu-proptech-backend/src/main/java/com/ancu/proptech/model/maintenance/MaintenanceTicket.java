package com.ancu.proptech.model.maintenance;

import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.Instant;

@Entity @Table(name="maintenance_tickets") @Getter @Setter @NoArgsConstructor
public class MaintenanceTicket {
    public enum Status { PENDING, ACCEPTED, IN_PROGRESS, AWAITING_CONFIRMATION, RESOLVED, CANCELLED, REJECTED }
    public enum Category { ELECTRIC, WATER, AIRCON, FURNITURE, OTHER }
    public enum Priority { NORMAL, HIGH, URGENT }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="property_id") private Property property;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="apartment_id") private Apartment apartment;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="reporter_id") private AuthAccount reporter;
    @Nationalized @Column(nullable=false,length=200) private String title;
    @Nationalized @Column(nullable=false,length=3000) private String description;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Category category;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Priority priority;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private Status status;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Version private long version;
}
