package com.ancu.proptech.dto.auth;

import java.util.List;


public record AuthUserResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id, String email, String fullName, List<String> roles,
                               String accountStatus, String contactVerificationStatus, long version) {}
