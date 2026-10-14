package com.ancu.proptech.repository.identity;
import com.ancu.proptech.model.identity.IdentityProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface IdentityProfileRepository extends JpaRepository<IdentityProfile,UUID> {}
