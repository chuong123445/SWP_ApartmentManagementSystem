package com.ancu.proptech.repository.property;
import com.ancu.proptech.model.property.PropertySourceUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PropertySourceUnitRepository extends JpaRepository<PropertySourceUnit,Long> {
    List<PropertySourceUnit> findByPropertyId(Long propertyId);
}
