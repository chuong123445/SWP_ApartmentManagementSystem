package com.ancu.proptech.dto.property;
import com.ancu.proptech.dto.apartment.OwnerApartmentResponse;
import java.util.List;
public record OwnerPropertyCreated(OwnerPropertyResponse property, List<OwnerApartmentResponse> apartments) {}
