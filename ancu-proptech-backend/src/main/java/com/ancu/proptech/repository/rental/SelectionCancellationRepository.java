package com.ancu.proptech.repository.rental;
import com.ancu.proptech.model.rental.SelectionCancellation;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SelectionCancellationRepository extends JpaRepository<SelectionCancellation,Long> {
 boolean existsByRequestIdAndState(Long requestId,SelectionCancellation.State state);
}
