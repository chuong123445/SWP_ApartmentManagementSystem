package com.ancu.proptech.service.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.annotation.Configuration;
import static org.junit.jupiter.api.Assertions.assertEquals;

class GoogleLoginConfigurationTests {
    @Configuration(proxyBeanMethods = false)
    static class Config {}

    @Test void localClientIdIsAvailableWithoutAnEnvFile() {
        try (var context = new SpringApplicationBuilder(Config.class)
                .web(WebApplicationType.NONE).profiles("local")
                .run("--spring.config.import=", "--spring.main.banner-mode=off")) {
            assertEquals("227501184143-jp1d9snbes2nambctrii222odpd6ais9.apps.googleusercontent.com",
                    context.getEnvironment().getProperty("app.auth.google-client-id"));
        }
    }

    @Test void deploymentCanOverrideLocalClientId() {
        try (var context = new SpringApplicationBuilder(Config.class)
                .web(WebApplicationType.NONE).profiles("local")
                .run("--spring.config.import=", "--spring.main.banner-mode=off",
                        "--GOOGLE_CLIENT_ID=another-client.apps.googleusercontent.com")) {
            assertEquals("another-client.apps.googleusercontent.com",
                    context.getEnvironment().getProperty("app.auth.google-client-id"));
        }
    }
}
