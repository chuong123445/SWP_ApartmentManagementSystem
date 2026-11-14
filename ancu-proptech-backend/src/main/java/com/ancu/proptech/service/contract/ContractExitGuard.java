package com.ancu.proptech.service.contract;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.ancu.proptech.repository.contract.ContractExitCaseRepository;
import com.ancu.proptech.exception.common.ApiException;
import org.springframework.http.HttpStatus;
@Service @RequiredArgsConstructor
public class ContractExitGuard {
 private final ContractExitCaseRepository cases;
 public boolean blocks(Long id){return cases.findById(id).map(c->java.util.Set.of("PENDING","AGREED").contains(c.getTerminationState())||java.util.Set.of("PENDING","DISPUTED").contains(c.getHandoverState())).orElse(false);}
 public void requireOpen(Long id){if(blocks(id))throw new ApiException(HttpStatus.CONFLICT,"OPEN_CONTRACT_EXIT","Đang xử lý kết thúc thuê/bàn giao. Hãy xử lý đề nghị hiện tại trước khi thuê tiếp hoặc dùng luồng bàn giao cũ.");}
}
