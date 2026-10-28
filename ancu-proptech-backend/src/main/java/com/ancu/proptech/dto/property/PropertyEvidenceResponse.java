package com.ancu.proptech.dto.property;

public record PropertyEvidenceResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,String purpose,String filename,String contentType,long size) {}
