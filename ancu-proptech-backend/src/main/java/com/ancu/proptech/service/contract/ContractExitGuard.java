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
 public boolean blocksLeaseChange(Long id){return blocks(id)||cases.findById(id).map(c->java.util.Set.of("PENDING","OBJECTED").contains(c.getUnilateralState())).orElse(false);}
 public void requireLeaseChangeOpen(Long id){if(blocksLeaseChange(id))throw new ApiException(HttpStatus.CONFLICT,"OPEN_CONTRACT_EXIT","Đang có thông báo đơn phương hoặc phản đối. Cần xử lý trước khi thuê tiếp hoặc bàn giao cũ.");}
 public void requireOpen(Long id){if(blocks(id))throw new ApiException(HttpStatus.CONFLICT,"OPEN_CONTRACT_EXIT","Đang xử lý kết thúc thuê/bàn giao. Hãy xử lý đề nghị hiện tại trước khi thuê tiếp hoặc dùng luồng bàn giao cũ.");}
}
