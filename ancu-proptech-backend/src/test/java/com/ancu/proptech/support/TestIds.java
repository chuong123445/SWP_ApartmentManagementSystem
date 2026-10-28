package com.ancu.proptech.support;
public final class TestIds { private static final java.util.concurrent.atomic.AtomicLong NEXT=new java.util.concurrent.atomic.AtomicLong(System.nanoTime()); public static Long next(){return NEXT.incrementAndGet();} }
