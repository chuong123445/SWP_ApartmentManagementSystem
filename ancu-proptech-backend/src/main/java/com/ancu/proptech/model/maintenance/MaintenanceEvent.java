package com.ancu.proptech.model.maintenance;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import org.hibernate.annotations.Nationalized;
@Entity @Table(name="maintenance_events") @Getter @Setter @NoArgsConstructor
public class MaintenanceEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private Long ticketId;
 @Column(nullable=false) private Long actorId;
 @Column(nullable=false,length=40) private String action;
 @Nationalized @Column(nullable=false,length=3000) private String note;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
}
