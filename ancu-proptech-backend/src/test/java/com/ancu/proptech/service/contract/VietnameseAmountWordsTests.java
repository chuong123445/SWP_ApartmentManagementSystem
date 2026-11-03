package com.ancu.proptech.service.contract;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class VietnameseAmountWordsTests {
    @Test void spellsStoredRentWithCorrectGroupingAndVietnameseEndings() {
        assertEquals("Hai triệu sáu trăm nghìn đồng",VietnameseAmountWords.read("2600000"));
        assertEquals("Một trăm lẻ năm nghìn đồng",VietnameseAmountWords.read("105000"));
        assertEquals("Một nghìn không trăm lẻ năm đồng",VietnameseAmountWords.read("1005"));
        assertEquals("Hai mươi mốt nghìn không trăm mười lăm đồng",VietnameseAmountWords.read("21015"));
        assertEquals("Một tỷ đồng",VietnameseAmountWords.read("1000000000"));
        assertEquals("Một nghìn tỷ đồng",VietnameseAmountWords.read("1000000000000"));
        assertEquals("Không đồng",VietnameseAmountWords.read("0.00"));
    }
    @Test void neverRoundsDecimalPricesOrInventsCurrencyUnits() {
        assertEquals("Sáu triệu hai trăm nghìn phẩy năm đồng",VietnameseAmountWords.read("6200000.50"));
        assertEquals("Không phẩy không một đồng",VietnameseAmountWords.read("0.01"));
        assertThrows(IllegalArgumentException.class,()->VietnameseAmountWords.read("-1"));
    }
}
