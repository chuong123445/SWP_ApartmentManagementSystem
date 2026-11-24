package com.ancu.proptech.service.contract;
import com.ancu.proptech.dto.contract.ContractTerminationResult;
import com.ancu.proptech.repository.contract.ContractTerminationResultRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import java.util.*;
@Service @RequiredArgsConstructor
public class ContractTerminationResultService {
 private final ContractTerminationResultRepository repository;
 private final AccountAccessService access;
 @Transactional(readOnly=true) public List<ContractTerminationResult> latest(Jwt jwt,List<Long> ids){
  var actor=access.account(jwt).getId();
  if(ids==null||ids.isEmpty()||ids.size()>100||ids.stream().anyMatch(id->id==null||id<=0))throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_CONTRACT_IDS","Cần từ 1 đến 100 mã hợp đồng hợp lệ.");
  return repository.latest(actor,ids.stream().distinct().toList());
 }
}
