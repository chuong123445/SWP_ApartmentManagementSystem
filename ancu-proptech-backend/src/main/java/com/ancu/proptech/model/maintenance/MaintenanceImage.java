package com.ancu.proptech.model.maintenance;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="maintenance_images") @Getter @Setter @NoArgsConstructor
public class MaintenanceImage {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private Long ticketId;
 @Column(nullable=false,length=24) private String kind;
 @Column(nullable=false,length=40) private String contentType;
 @Column(nullable=false,columnDefinition="varbinary(max)") private byte[] content;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
}
