package com.ancu.proptech.dto.auth;

public record TokenResponse(String accessToken, String tokenType, long expiresIn, AuthUserResponse user) {}
