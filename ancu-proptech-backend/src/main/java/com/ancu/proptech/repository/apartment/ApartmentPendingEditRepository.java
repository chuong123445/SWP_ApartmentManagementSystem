package com.ancu.proptech.repository.apartment;

import com.ancu.proptech.model.apartment.ApartmentPendingEdit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ApartmentPendingEditRepository extends JpaRepository<ApartmentPendingEdit, UUID> {
}
