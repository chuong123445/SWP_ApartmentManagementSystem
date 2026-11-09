package com.ancu.proptech.service.billing;

import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.model.property.PropertySettings;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class InvoiceAmountMergeTests {
    private RentalInvoice calculate(String electricityEnd,String waterEnd,PropertySettings.WaterBillingMode mode)throws Exception{
        var invoice=new RentalInvoice();invoice.setMonthlyRent(new BigDecimal("5000000"));
        invoice.setElectricityStartReading(new BigDecimal("1000"));invoice.setElectricityEndReading(new BigDecimal(electricityEnd));invoice.setElectricityUnitPrice(new BigDecimal("3500"));
        invoice.setWaterStartReading(new BigDecimal("200"));invoice.setWaterEndReading(new BigDecimal(waterEnd));invoice.setWaterUnitPrice(new BigDecimal("15000"));
        invoice.setWaterBillingMode(mode);invoice.setOccupantCount(2);invoice.setInternetFee(BigDecimal.ZERO);invoice.setGarbageFee(BigDecimal.ZERO);
        var method=InvoiceService.class.getDeclaredMethod("calculateAmounts",RentalInvoice.class);method.setAccessible(true);method.invoke(null,invoice);return invoice;
    }
    @Test void meteredCalculationIncludesRentElectricityAndWater()throws Exception{
        var invoice=calculate("1120","208",PropertySettings.WaterBillingMode.METERED);
        assertEquals(0,new BigDecimal("5540000").compareTo(invoice.getTotalAmount()));
        assertEquals(0,new BigDecimal("420000").compareTo(invoice.getElectricityAmount()));
        assertEquals(0,new BigDecimal("120000").compareTo(invoice.getWaterAmount()));
    }
    @Test void perPersonWaterRetainsBaselineAndUsesOccupantCount()throws Exception{
        var invoice=calculate("1120","999",PropertySettings.WaterBillingMode.PER_PERSON);
        assertEquals(0,new BigDecimal("200").compareTo(invoice.getWaterEndReading()));
        assertEquals(0,new BigDecimal("30000").compareTo(invoice.getWaterAmount()));
        assertEquals(0,new BigDecimal("5450000").compareTo(invoice.getTotalAmount()));
    }
    @Test void fractionalReadingsPreserveDraftCorrectionTotals()throws Exception{
        var invoice=calculate("1130.25","209.50",PropertySettings.WaterBillingMode.METERED);
        assertEquals(0,new BigDecimal("5598375").compareTo(invoice.getTotalAmount()));
    }
}
