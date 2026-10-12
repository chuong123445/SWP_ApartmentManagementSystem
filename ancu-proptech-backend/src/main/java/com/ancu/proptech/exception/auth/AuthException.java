package com.ancu.proptech.exception.auth;

import org.springframework.http.HttpStatus;

public class AuthException extends RuntimeException {
    public final HttpStatus status;
    public final String code;
    public AuthException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
