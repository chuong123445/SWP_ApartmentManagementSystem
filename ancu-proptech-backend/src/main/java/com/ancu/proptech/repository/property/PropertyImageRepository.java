package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertyImage;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface PropertyImageRepository extends JpaRepository<PropertyImage,Long> {
    List<PropertyImage> findByPropertyIdAndApartmentIdIsNullOrderByPositionAsc(Long propertyId);
    List<PropertyImage> findByApartmentIdOrderByPositionAsc(Long apartmentId);
    @Query("select i.id from PropertyImage i where i.apartmentId=:apartmentId order by i.position")
    List<Long> unitIds(@org.springframework.data.repository.query.Param("apartmentId") Long apartmentId);
    @org.springframework.data.jpa.repository.Query("select i.id from PropertyImage i where i.propertyId=:propertyId and i.apartmentId is null order by i.position")
    List<Long> ids(@org.springframework.data.repository.query.Param("propertyId") Long propertyId);
    long countByUploaderIdAndPropertyIdIsNull(Long uploaderId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from PropertyImage i where i.id=:id")
    Optional<PropertyImage> findForBinding(@org.springframework.data.repository.query.Param("id") Long id);
}
