package com.ancu.proptech.service.billing;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.model.billing.RentalInvoice;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class CalendarRentScheduleTests {
 private RentalContract contract(String from,String to,int cycle,String price){var c=new RentalContract();c.setStartDate(LocalDate.parse(from));c.setEndDate(LocalDate.parse(to));c.setRentCycleMonths(cycle);c.setMonthlyRent(new BigDecimal(price));c.setCalendarRentBilling(true);return c;}
 private RentalInvoice sent(RentSchedule.Period p){var i=new RentalInvoice();i.setKind(RentalInvoice.Kind.RENT);i.setStatus(RentalInvoice.Status.SENT);i.setCoverageStart(p.start());i.setCoverageEnd(p.end());return i;}
 @Test void firstQuarterIsPartialJanuaryPlusFebruaryMarchThenFullQuarterThenLastPartial(){
  var c=contract("2027-01-15","2027-07-14",3,"3000000");var first=RentSchedule.next(c,List.of());
  assertEquals(LocalDate.of(2027,3,31),first.end());assertEquals(new BigDecimal("7645161"),RentSchedule.amount(c,first));
  var second=RentSchedule.next(c,List.of(sent(first)));assertEquals(LocalDate.of(2027,4,1),second.start());assertEquals(LocalDate.of(2027,6,30),second.end());assertEquals(new BigDecimal("9000000"),RentSchedule.amount(c,second));
  var last=RentSchedule.next(c,List.of(sent(first),sent(second)));assertEquals(LocalDate.of(2027,7,14),last.end());assertEquals(new BigDecimal("1354839"),RentSchedule.amount(c,last));assertNull(RentSchedule.next(c,List.of(sent(first),sent(second),sent(last))));
 }
 @Test void leapFebruaryUses29DaysAndMonthlyStartHasNoSurcharge(){
  var c=contract("2028-02-15","2028-05-14",3,"3000000");assertEquals(new BigDecimal("7551724"),RentSchedule.amount(c,RentSchedule.next(c,List.of())));
  var full=contract("2027-01-01","2027-03-31",3,"3000000");assertEquals(new BigDecimal("9000000"),RentSchedule.amount(full,RentSchedule.next(full,List.of())));
 }
 @Test void monthlyPartialContractUsesCalendarPartsAndRoundsOnlyTotal(){
  var c=contract("2027-01-15","2027-02-14",1,"3000000");var p=RentSchedule.next(c,List.of());assertEquals(new BigDecimal("1645161"),RentSchedule.amount(c,p));assertEquals(LocalDate.of(2027,1,31),p.end());
  var last=RentSchedule.next(c,List.of(sent(p)));assertEquals(new BigDecimal("1500000"),RentSchedule.amount(c,last));assertTrue(RentSchedule.calculation(c,p).contains("17/31"));assertFalse(RentSchedule.partial(c));
 }
 @Test void cancelledPriorQuarterIsTheNextGapEvenWithLaterPaidCoverage(){
  var c=contract("2027-01-15","2027-12-31",3,"3000000");var first=RentSchedule.next(c,List.of());var i=sent(first);var second=RentSchedule.next(c,List.of(i));i.setStatus(RentalInvoice.Status.CANCELLED);
  assertEquals(first,RentSchedule.next(c,List.of(i,sent(second))));
 }
 @Test void shortFinalCycleNeverChargesPastContractAndUnknownOverlapsAreRejected(){
  var c=contract("2027-01-15","2027-02-14",3,"3000000");var p=RentSchedule.next(c,List.of());assertEquals(c.getEndDate(),p.end());assertEquals(new BigDecimal("3145161"),RentSchedule.amount(c,p));
  var wrong=sent(p);wrong.setCoverageEnd(LocalDate.of(2027,1,31));assertThrows(com.ancu.proptech.exception.common.ApiException.class,()->RentSchedule.next(c,List.of(wrong)));
 }
 @Test void roundsTheCombinedRentOnlyOnceAtHalfVnd(){
  var c=contract("2027-01-01","2027-03-31",3,"0.50");assertEquals(new BigDecimal("2"),RentSchedule.amount(c,RentSchedule.next(c,List.of())));
 }
}
