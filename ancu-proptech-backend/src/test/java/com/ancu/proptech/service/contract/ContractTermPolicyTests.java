package com.ancu.proptech.service.contract;
import java.time.LocalDate;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.*;
class ContractTermPolicyTests {
 @ParameterizedTest @CsvSource({"2027-01-15,2027-02-12,false,false","2027-01-15,2027-02-13,true,true","2027-01-15,2027-02-14,true,true","2027-02-15,2027-03-14,false,false","2028-02-15,2028-03-14,false,false","2027-01-31,2027-03-01,true,true","2027-01-15,2027-07-14,true,false"})
 void inclusiveMinimumAndPackageBoundaries(String from,String to,boolean allowed,boolean pack){
  var start=LocalDate.parse(from);var end=LocalDate.parse(to);assertEquals(allowed,ContractTermPolicy.atLeast30Days(start,end));assertEquals(pack,ContractTermPolicy.oneMonthPackage(start,end));
 }
}
