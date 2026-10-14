package com.ancu.proptech.dto.contract;
import java.time.LocalDate;
import java.util.*;
public record ContractSnapshot(Party owner, Party customer, Asset asset, ReceivingAccount receivingAccount) {
    public record Party(UUID id,String fullName,String email,String phone,String address,LocalDate dateOfBirth,boolean emailVerified) {}
    public record Asset(UUID apartmentId,UUID propertyId,String propertyName,String title,String roomNumber,String address,
            String city,String district,String ward,String areaM2,Integer floor,Integer bedrooms,Integer bathrooms,List<String> amenities,
            String approvalStatus,UUID approvedDossierId,String exploitationRight) {}
    public record ReceivingAccount(String bank,String accountNumber,String accountHolderName) {}
}
