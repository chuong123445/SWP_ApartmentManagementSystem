package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.*;

@Entity @Table(name="property_right_notices") @Getter @Setter @NoArgsConstructor
public class PropertyRightNotice {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="property_id",nullable=false) private Property property;
    @Column(nullable=false) private Long recipientId;
    @Column(nullable=false) private Long dossierId;
    @Column(nullable=false,length=16) private String kind;
    @Column(nullable=false) private LocalDate expiresOn;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
    @Column(nullable=false,length=16) private String emailStatus;
    @Nationalized @Column(length=254) private String emailDestination;
    @Column(nullable=false) private int attempts;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant nextAttemptAt;
    @Version private long version;
}
