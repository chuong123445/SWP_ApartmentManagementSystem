package com.ancu.proptech.dto.billing;
public record BillingTariff(String electricityUnitPrice,String waterUnitPrice,String waterBillingMode,String internetFee,String garbageFee,long version) {}
