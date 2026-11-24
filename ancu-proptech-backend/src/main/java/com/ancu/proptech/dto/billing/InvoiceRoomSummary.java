package com.ancu.proptech.dto.billing;
public record InvoiceRoomSummary(String apartmentId,String roomNumber,String apartmentTitle,String propertyId,String propertyName,long unpaidInvoiceCount,String unpaidInvoiceAmount){}
