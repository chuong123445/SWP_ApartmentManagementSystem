package com.ancu.proptech.model.rental;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="selection_cancellation_events") @Getter @Setter @NoArgsConstructor
public class SelectionCancellationEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,updatable=false) private Long requestId;
 @Column(nullable=false,updatable=false) private Long actorId;
 @Column(nullable=false,columnDefinition="nvarchar(100)",updatable=false) private String actorName;
 @Column(nullable=false,length=24,updatable=false) private String action;
 @Column(columnDefinition="nvarchar(2000)",updatable=false) private String reason;
 @Column(nullable=false,columnDefinition="datetime2(6)",updatable=false) private Instant createdAt;
 @Column(nullable=false,columnDefinition="nvarchar(max)",updatable=false) private String beforeJson;
 @Column(nullable=false,columnDefinition="nvarchar(max)",updatable=false) private String afterJson;
}
