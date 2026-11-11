package com.ancu.proptech.service.billing;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.model.billing.RentalInvoice;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class RentScheduleTests {
    private RentalContract contract(String start,String end,int cycle){var c=new RentalContract();c.setStartDate(LocalDate.parse(start));c.setEndDate(LocalDate.parse(end));c.setRentCycleMonths(cycle);return c;}
    @Test void allCyclesIncludeMonthlyAndKeepWholeCalendarMonths(){
        for(int months:new int[]{1,3,6,12}){
            var period=RentSchedule.next(contract("2026-01-01","2026-12-31",months),List.of());
            assertEquals(months,period.months());assertEquals(LocalDate.of(2026,1,1).plusMonths(months).minusDays(1),period.end());
        }
    }
    @Test void shortFinalCycleBillsRemainingWholeMonthsAndLeavesPartialDaysForManualHandling(){
        var c=contract("2026-01-15","2026-05-20",6);var period=RentSchedule.next(c,List.of());
        assertEquals(LocalDate.of(2026,2,1),period.start());assertEquals(LocalDate.of(2026,4,30),period.end());assertEquals(3,period.months());assertTrue(RentSchedule.partial(c));
        assertNull(RentSchedule.next(contract("2026-01-15","2026-01-20",1),List.of()));
    }
    @Test void legacyRentCoveragePreventsDoubleChargingAndUtilityDoesNotAdvanceRent(){
        var old=new RentalInvoice();old.setPeriod("2026-01");
        var utility=new RentalInvoice();utility.setKind(RentalInvoice.Kind.UTILITY);utility.setPeriod("2026-10");
        assertEquals(LocalDate.of(2026,2,1),RentSchedule.next(contract("2026-01-01","2026-12-31",1),List.of(old,utility)).start());
    }
}
