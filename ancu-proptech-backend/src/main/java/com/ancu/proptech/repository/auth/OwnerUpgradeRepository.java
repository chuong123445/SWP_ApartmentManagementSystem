package com.ancu.proptech.repository.auth;
import com.ancu.proptech.model.auth.OwnerUpgrade;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface OwnerUpgradeRepository extends JpaRepository<OwnerUpgrade,UUID>{}
