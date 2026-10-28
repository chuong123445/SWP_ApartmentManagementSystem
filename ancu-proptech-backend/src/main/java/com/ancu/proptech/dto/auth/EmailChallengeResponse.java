package com.ancu.proptech.dto.auth;
import java.time.Instant;

public record EmailChallengeResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,String destinationHint,Instant expiresAt,String status) {}
