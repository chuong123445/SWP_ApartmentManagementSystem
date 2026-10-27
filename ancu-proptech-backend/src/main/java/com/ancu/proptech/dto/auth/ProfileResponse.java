package com.ancu.proptech.dto.auth;
import java.time.LocalDate;
import java.util.*;
public record ProfileResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,String email,String phone,String fullName,LocalDate dateOfBirth,String address,String bio,
        List<String> roles,String accountStatus,String contactVerificationStatus,boolean emailVerified,boolean phoneVerified,
        boolean emailOtpAvailable,long version) {}
