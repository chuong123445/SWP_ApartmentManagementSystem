package com.ancu.proptech.dto.billing;
import jakarta.validation.constraints.*;
public final class UtilityInvoiceAiDtos {
 private UtilityInvoiceAiDtos(){}
 public record Command(@NotBlank @Size(max=2000) String message,@NotBlank String period,@Min(0) long baselineVersion){}
 public record Suggestion(String contractId,String roomNumber,String period,long baselineVersion,String electricityEndReading,String waterEndReading){}
}
