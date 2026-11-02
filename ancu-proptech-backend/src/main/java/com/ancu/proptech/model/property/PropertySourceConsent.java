package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
/** Đồng ý đọc nguồn riêng với quyền Owner; giữ binding để không dùng consent của tài khoản khác. */
@Entity @Table(name="property_source_consents") @Getter @Setter @NoArgsConstructor
public class PropertySourceConsent {
    @Id private Long accountId;
    @Column(nullable=false,length=300) private String issuer;
    @Column(nullable=false,length=255) private String subject;
    @Column(nullable=false,columnDefinition="datetime2(6)") private Instant consentedAt;
    @Column(nullable=false,length=40) private String consentVersion;
}
