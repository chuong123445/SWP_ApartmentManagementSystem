package com.ancu.proptech.model.apartment;

import com.ancu.proptech.model.property.Property;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "rental_apartments") @Getter @Setter @NoArgsConstructor
public class Apartment {
    public enum PublicationStatus { DRAFT, PUBLISHED, HIDDEN }
    public enum Availability { VACANT, CONTRACT_IN_PROGRESS, OCCUPIED, MAINTENANCE }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "property_id", nullable = false)
    private Property property;
    @Nationalized @Column(length = 20) private String roomNumber;
    private Integer floor;
    @Column(precision = 15, scale = 2) private BigDecimal deposit;
    private Integer electricityIndex;
    private Integer waterIndex;
    private Integer maxOccupants;
    @Nationalized @Column(nullable = false, length = 150) private String title;
    @Nationalized @Column(nullable = false, length = 3000) private String description;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal areaM2;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal advertisedMonthlyRent;
    @Column(precision=15,scale=2) private BigDecimal electricityUnitPrice;
    @Column(precision=15,scale=2) private BigDecimal waterUnitPrice;
    private Integer bedrooms;
    private Integer bathrooms;
    @Column(length = 500) private String coverImagePath;
    @ElementCollection @CollectionTable(name = "rental_apartment_amenities", joinColumns = @JoinColumn(name = "apartment_id"))
    @Nationalized @Column(name = "amenity", length = 100) private List<String> amenities = new ArrayList<>();
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private PublicationStatus publicationStatus;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private Availability availability;
    @Column(nullable = false, columnDefinition = "datetime2(6)") private Instant createdAt;
    @Version private long version;
}
