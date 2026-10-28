package com.ancu.proptech.config.auth;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.net.URI;

/** Cấu hình công khai; không chứa client secret của SPA. */
@Component @ConfigurationProperties(prefix="app.auth.vneid") @Getter @Setter
public class VneidProperties {
    private boolean enabled;
    private String issuer = "";
    private String audience = "";
    private String clientId = "";
    private String connection = "Username-Password-Authentication";
    public void validate() {
        if (!enabled) return;
        URI uri = URI.create(issuer);
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getQuery() != null || uri.getFragment() != null || !"/".equals(uri.getPath())
                || audience.isBlank() || clientId.isBlank() || connection.isBlank())
            throw new IllegalStateException("VNeID requires HTTPS issuer ending in /, audience, client ID and connection.");
    }
}
