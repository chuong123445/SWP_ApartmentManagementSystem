package com.ancu.proptech.service.rental;
import com.ancu.proptech.repository.rental.SelectionCancellationRepository;
import com.ancu.proptech.model.rental.SelectionCancellation;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
/** Call only after acquiring the accepted parent request lock. */
@Service @RequiredArgsConstructor public class SelectionCancellationGuard {
 private final SelectionCancellationRepository cancellations;
 public String state(Long requestId){return cancellations.findById(requestId).map(c->c.getState().name()).orElse("NONE");}
 public void requireOpen(Long requestId){if(cancellations.existsByRequestIdAndState(requestId,SelectionCancellation.State.PENDING))throw new ApiException(HttpStatus.CONFLICT,"CANCELLATION_PENDING","Đang chờ phản hồi đề nghị hủy. Chưa thể sửa hoặc ký tiếp.");}
}
