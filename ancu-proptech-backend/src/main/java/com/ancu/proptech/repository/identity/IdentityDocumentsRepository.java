package com.ancu.proptech.repository.identity;
import com.ancu.proptech.model.identity.IdentityDocuments;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface IdentityDocumentsRepository extends JpaRepository<IdentityDocuments,UUID> {}
