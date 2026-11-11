package com.ancu.proptech.service.auth;
public interface EmailOtpSender {
    boolean isConfigured();
    void send(String destination,String code);
    default void sendAction(String destination,String code,String purpose){send(destination,code);}
}
