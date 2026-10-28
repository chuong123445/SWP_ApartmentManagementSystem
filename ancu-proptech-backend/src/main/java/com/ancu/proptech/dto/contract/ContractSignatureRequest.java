package com.ancu.proptech.dto.contract;

import jakarta.validation.constraints.*;

public record ContractSignatureRequest(
        @NotNull @PositiveOrZero Long version,
        @NotBlank @Pattern(regexp="[a-f0-9]{64}") String contentHash,
        @NotBlank @Size(max=200000) String signature,
        @AssertTrue(message="Bạn cần xác nhận đã đọc và đồng ý nội dung hợp đồng.") boolean consent) {}
