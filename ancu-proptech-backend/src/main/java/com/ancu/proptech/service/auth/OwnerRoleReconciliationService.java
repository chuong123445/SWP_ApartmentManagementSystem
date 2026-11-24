package com.ancu.proptech.service.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OwnerRoleReconciliationService {
    private final PropertyRepository properties;
    private final AuthAccountRepository accounts;

    @Transactional
    public boolean reconcile(AuthAccount account) {
        if (account == null || account.getId() == null) return false;
        if (account.hasRole(AuthAccount.Role.OWNER)
                && !account.hasRole(AuthAccount.Role.ADMIN)
                && !properties.existsByOwnerIdAndApprovalStatus(account.getId(), Property.ApprovalStatus.APPROVED)) {
            log.info("Đồng bộ vai trò: Tài khoản {} ({}) không có tài sản đã duyệt, thu hồi quyền OWNER về CUSTOMER",
                    account.getId(), account.getEmail());
            account.setRole(AuthAccount.Role.CUSTOMER);
            accounts.save(account);
            accounts.flush();
            return true;
        }
        return false;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void reconcileAllOnStartup() {
        for (AuthAccount account : accounts.findAll()) {
            reconcile(account);
        }
    }
}
