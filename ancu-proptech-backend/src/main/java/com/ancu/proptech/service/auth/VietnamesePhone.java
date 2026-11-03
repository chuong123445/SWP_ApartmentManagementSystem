package com.ancu.proptech.service.auth;

import org.springframework.http.HttpStatus;

/** Vietnamese mobile (10 domestic digits) or landline (11), normalized to +84. */
public final class VietnamesePhone {
    private VietnamesePhone() {}
    public static String normalize(String raw) {
        if(raw==null||raw.isBlank())return null;
        String value=raw.strip().replaceAll("[ .()\\-]","");
        if(value.startsWith("0"))value="+84"+value.substring(1);
        if(!value.matches("\\+84(?:[35789][0-9]{8}|2[0-9]{9})"))
            throw AccountService.error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Số điện thoại Việt Nam không hợp lệ. Dùng số di động 10 chữ số hoặc số cố định 11 chữ số, bắt đầu bằng 0 hoặc +84.");
        return value;
    }
    public static String required(String raw) {
        String value=normalize(raw);
        if(value==null)throw AccountService.error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Số điện thoại là bắt buộc.");
        return value;
    }
}
