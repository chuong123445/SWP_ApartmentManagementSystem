package com.ancu.proptech.dto.contract;

import jakarta.validation.constraints.*;

public record ContractSignatureRequest(
        @NotNull @PositiveOrZero Long version,
        @NotBlank @Pattern(regexp="[a-f0-9]{64}") String contentHash,
        @NotBlank @Size(max=200000) String signature,
        @AssertTrue(message="Bạn cần xác nhận đã đọc và đồng ý nội dung hợp đồng.") boolean consent,
        @Size(max=36) String challengeId,@Pattern(regexp="[0-9]{6}") String code) {
    public ContractSignatureRequest(Long version,String contentHash,String signature,boolean consent){this(version,contentHash,signature,consent,null,null);}
}
