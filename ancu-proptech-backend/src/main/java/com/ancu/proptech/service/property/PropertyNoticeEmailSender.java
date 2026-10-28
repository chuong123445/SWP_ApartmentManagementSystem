package com.ancu.proptech.service.property;
import java.time.LocalDate;
public interface PropertyNoticeEmailSender {
    boolean isConfigured();
    void send(String destination,String propertyName,LocalDate expiresOn,boolean expired);
}
