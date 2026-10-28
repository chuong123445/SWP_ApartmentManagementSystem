package com.ancu.proptech.config.bootstrap;
import com.ancu.proptech.service.bootstrap.LocalAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
@Component @Profile("local") @RequiredArgsConstructor
public class LocalAdminInitializer implements ApplicationRunner {
    private final LocalAdminService admins;
    @Value("${LOCAL_ADMIN_EMAIL:}") private String email;
    @Value("${LOCAL_ADMIN_PASSWORD:}") private String password;
    @Value("${LOCAL_ADMIN_NAME:Admin An Cư}") private String name;
    @Value("${app.admin.local-provisioning:true}") private boolean enabled;
    @Override public void run(ApplicationArguments arguments){if(enabled)admins.provision(email,password,name);}
}
