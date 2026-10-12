package com.ancu.proptech.dto.auth;

import java.util.List;
import java.util.UUID;

public record AuthUserResponse(UUID id, String email, String fullName, List<String> roles,
                               String accountStatus, String contactVerificationStatus, long version) {}
