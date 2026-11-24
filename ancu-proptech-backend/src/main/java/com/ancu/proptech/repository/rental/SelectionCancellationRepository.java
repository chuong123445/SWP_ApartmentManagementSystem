package com.ancu.proptech.repository.rental;
import com.ancu.proptech.model.rental.SelectionCancellation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface SelectionCancellationRepository extends JpaRepository<SelectionCancellation,Long> {
 boolean existsByRequestIdAndState(Long requestId,SelectionCancellation.State state);
 List<SelectionCancellation> findByState(SelectionCancellation.State state);
}
