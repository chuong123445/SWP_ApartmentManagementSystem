package com.ancu.proptech.dto.auth;
import java.time.Instant;
import java.util.UUID;
public record EmailChallengeResponse(UUID id,String destinationHint,Instant expiresAt,String status) {}
