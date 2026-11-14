package com.ancu.proptech.repository.billing;
import com.ancu.proptech.model.billing.MeterReading;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface MeterReadingRepository extends JpaRepository<MeterReading,Long>{Optional<MeterReading> findByContractIdAndPeriod(Long contractId,String period);}
