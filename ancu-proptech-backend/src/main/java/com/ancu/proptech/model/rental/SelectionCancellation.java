package com.ancu.proptech.model.rental;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name="selection_cancellations") @Getter @Setter @NoArgsConstructor
public class SelectionCancellation {
 public enum State { PENDING, CANCELLED, REJECTED, WITHDRAWN }
 @Id private Long requestId;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private State state;
 @Column(nullable=false) private Long proposerId;
 @Column(nullable=false,columnDefinition="nvarchar(2000)") private String reason;
 private Long responderId;
 @Column(columnDefinition="nvarchar(2000)") private String responseReason;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant createdAt;
 @Column(nullable=false,columnDefinition="datetime2(6)") private Instant updatedAt;
 @Version private long version;
}
