package com.ancu.proptech.service.contract;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Dates include both the first and last rental day. */
public final class ContractTermPolicy {
    private ContractTermPolicy() {}
    public static boolean atLeast30Days(LocalDate start,LocalDate end) {
        return ChronoUnit.DAYS.between(start,end)+1>=30;
    }
    public static boolean oneMonthPackage(LocalDate start,LocalDate end) {
        return atLeast30Days(start,end) && (end.equals(start.plusDays(29)) || end.equals(start.plusMonths(1).minusDays(1)));
    }
}
