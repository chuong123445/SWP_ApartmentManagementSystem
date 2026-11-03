package com.ancu.proptech.service.auth;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class VietnamesePhoneTests {
    @Test void normalizesVietnameseMobileAndLandlineFormats(){
        assertEquals("+84912345678",VietnamesePhone.required("0912 345 678"));
        assertEquals("+84312345678",VietnamesePhone.required("+84 312.345.678"));
        assertEquals("+842812345678",VietnamesePhone.required("028-1234-5678"));
        for(String prefix:new String[]{"03","05","07","08","09"})assertNotNull(VietnamesePhone.required(prefix+"12345678"));
    }
    @Test void rejectsForeignWrongLengthOldPrefixAlphabetAndMissingRequiredPhone(){
        for(String value:new String[]{""," ","+12025550123","+840912345678","0612345678","091234567","09123456789","01234567890","09123456ab","０９１２３４５６７８"})assertThrows(RuntimeException.class,()->VietnamesePhone.required(value),value);
        assertNull(VietnamesePhone.normalize(null));assertThrows(RuntimeException.class,()->VietnamesePhone.required(null));
    }
}
