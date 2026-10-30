package com.ancu.proptech.dto.property;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import com.ancu.proptech.dto.contract.ContractSnapshot;
public final class PropertySettingsDtos {
 private PropertySettingsDtos() {}
 public record Save(@NotNull @PositiveOrZero Long version,
  @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) BigDecimal electricityUnitPrice,
  @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) BigDecimal waterUnitPrice,
  @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) BigDecimal internetFee,
  @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) BigDecimal garbageFee) {}
 public record View(String propertyId,String propertyName,boolean configured,long version,
  String electricityUnitPrice,String waterUnitPrice,String internetFee,String garbageFee,
  Instant updatedAt,ContractSnapshot.ReceivingAccount receivingAccount) {}
}
