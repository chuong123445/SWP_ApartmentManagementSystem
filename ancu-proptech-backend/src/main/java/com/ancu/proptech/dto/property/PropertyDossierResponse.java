package com.ancu.proptech.dto.property;
import java.util.*;
import java.time.Instant;
public record PropertyDossierResponse(UUID id,UUID propertyId,String propertyName,String propertyAddress,
    String applicantName,String rightType,String bank,String accountNumber,String accountHolderName,String status,
    List<PropertyEvidenceResponse> files,Instant submittedAt,Instant reviewedAt,String reviewReason,long version) {}
