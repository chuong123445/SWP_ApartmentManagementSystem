package com.ancu.proptech.repository.rental;
import com.ancu.proptech.model.rental.SelectionCancellationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface SelectionCancellationEventRepository extends JpaRepository<SelectionCancellationEvent,Long> {
 List<SelectionCancellationEvent> findByRequestIdOrderByIdAsc(Long requestId);
}
