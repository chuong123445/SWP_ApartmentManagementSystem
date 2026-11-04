package com.ancu.proptech.service.contract;
import com.ancu.proptech.repository.contract.ContractExpiryNoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;

@Service @RequiredArgsConstructor
public class ContractExpiryService {
    private final ContractExpiryNoticeRepository notices;
    @Transactional public int generate(LocalDate today){return notices.generate(today);}
}
