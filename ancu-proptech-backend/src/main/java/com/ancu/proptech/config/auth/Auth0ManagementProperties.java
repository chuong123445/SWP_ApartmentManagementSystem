package com.ancu.proptech.config.auth;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Bí mật chỉ ở Backend/env, không dùng Lombok toString. */
@Component @ConfigurationProperties(prefix="app.auth.management") @Getter @Setter
public class Auth0ManagementProperties {
    private String clientId="";
    private String clientSecret="";
}
