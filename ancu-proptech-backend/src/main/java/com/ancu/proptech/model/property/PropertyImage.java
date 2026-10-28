package com.ancu.proptech.model.property;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;


/** Ảnh quảng bá tách riêng giấy tờ; chỉ công khai khi tài sản có căn đã đăng. */
@Entity @Table(name="property_images") @Getter @Setter @NoArgsConstructor
public class PropertyImage {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private Long uploaderId;
    private Long propertyId;
    @Column(nullable=false) private int position;
    @Column(nullable=false) private String contentType;
    @Column(nullable=false) private Instant createdAt;
    @Lob @Column(nullable=false,columnDefinition="varbinary(max)") private byte[] content;
}
