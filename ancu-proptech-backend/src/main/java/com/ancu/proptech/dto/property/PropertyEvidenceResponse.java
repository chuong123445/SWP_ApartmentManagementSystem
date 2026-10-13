package com.ancu.proptech.dto.property;
import java.util.UUID;
public record PropertyEvidenceResponse(UUID id,String purpose,String filename,String contentType,long size) {}
