package com.ancu.proptech.model.identity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="account_identity_submission_images") @Getter @Setter @NoArgsConstructor
public class IdentitySubmissionImages {
 @Id private Long id;
 @Column(nullable=false,updatable=false,columnDefinition="varbinary(max)") private byte[] frontContent;
 @Column(nullable=false,updatable=false,length=30) private String frontContentType;
 @Column(nullable=false,updatable=false,columnDefinition="varbinary(max)") private byte[] backContent;
 @Column(nullable=false,updatable=false,length=30) private String backContentType;
}
