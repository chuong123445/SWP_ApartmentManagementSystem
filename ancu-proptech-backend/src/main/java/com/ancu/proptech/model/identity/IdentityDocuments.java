package com.ancu.proptech.model.identity;
import jakarta.persistence.*;
import lombok.*;


@Entity @Table(name="account_identity_documents") @Getter @Setter @NoArgsConstructor
public class IdentityDocuments {
    @Id private Long accountId;
    @Column(nullable=false,columnDefinition="varbinary(max)") private byte[] frontContent;
    @Column(nullable=false,length=30) private String frontContentType;
    @Column(nullable=false,columnDefinition="varbinary(max)") private byte[] backContent;
    @Column(nullable=false,length=30) private String backContentType;
}
