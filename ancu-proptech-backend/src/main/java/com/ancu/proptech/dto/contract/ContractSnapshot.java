package com.ancu.proptech.dto.contract;
import java.time.LocalDate;
import java.util.*;
public record ContractSnapshot(Party owner, Party customer, Asset asset, ReceivingAccount receivingAccount,String ownerPaymentQrId) {
    public ContractSnapshot(Party owner,Party customer,Asset asset,ReceivingAccount receivingAccount){this(owner,customer,asset,receivingAccount,null);}
    public record Party(String id,String fullName,String email,String phone,String address,LocalDate dateOfBirth,boolean emailVerified,
            String documentNumber,LocalDate documentIssueDate,String documentIssuePlace,String permanentAddress,String identityVerificationStatus,Boolean localFixture) {}
    public record Asset(String apartmentId,String propertyId,String propertyName,String title,String roomNumber,String address,
            String city,String district,String ward,String areaM2,Integer floor,Integer bedrooms,Integer bathrooms,List<String> amenities,
            String approvalStatus,String approvedDossierId,String exploitationRight,String certificateNumber,LocalDate certificateIssueDate,
            String certificateIssuePlace,String exploitationRightDescription,Boolean localFixture) {}
    public record ReceivingAccount(String bank,String accountNumber,String accountHolderName) {}
}
