package com.ancu.proptech.dto.apartment;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
public final class AiSearchDtos {
 private AiSearchDtos(){}
 public record Request(@NotBlank @Size(max=1000) String text,@NotNull @AssertTrue Boolean consent){}
 public record Filters(@Size(max=120) String q,@Size(max=80) String city,@Size(max=80) String district,@Size(max=80) String ward,
  @DecimalMin("0") @Digits(integer=13,fraction=2) @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal minRent,
  @DecimalMin("0") @Digits(integer=13,fraction=2) @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal maxRent,
  @DecimalMin("0") @Digits(integer=7,fraction=2) @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal minArea,
  @DecimalMin("0") @Digits(integer=7,fraction=2) @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal maxArea,
  @Min(0) @Max(100) Integer bedrooms,@Min(1) @Max(100) Integer occupants){
   @JsonAnySetter public void reject(String field,Object value){throw new IllegalArgumentException("Unsupported filter");}
 }
 public record Result(String runId,String sourceHash,String model,String promptVersion,Instant createdAt,Filters filters,List<String> notes,boolean canApply){}
 public record Apply(@NotNull @jakarta.validation.Valid Filters filters){}
}
