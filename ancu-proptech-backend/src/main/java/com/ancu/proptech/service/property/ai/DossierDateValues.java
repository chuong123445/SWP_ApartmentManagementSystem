package com.ancu.proptech.service.property.ai;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.Set;

final class DossierDateValues {
    private static final Set<String> FIELDS=Set.of("certificateIssueDate","rightsValidFrom","rightsValidUntil","originalLeaseFrom","originalLeaseUntil");
    private static final DateTimeFormatter LOCAL=DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT);
    private DossierDateValues() {}

    static String normalize(String field,String value) {
        if(!FIELDS.contains(field)||value.isBlank())return value;
        try {
            String text=value.strip();
            return LocalDate.parse(text,text.matches("\\d{2}/\\d{2}/\\d{4}")?LOCAL:DateTimeFormatter.ISO_LOCAL_DATE).toString();
        } catch(DateTimeParseException exception) {
            return value;
        }
    }
}
