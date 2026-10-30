package com.ancu.proptech.config.property;
import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Component @ConfigurationProperties(prefix="app.dossier-ai") @Getter @Setter
public class DossierAiSettings {
    private boolean enabled=false;
    private String apiKey="";
    private String model="";
    private String baseUrl="https://generativelanguage.googleapis.com/v1beta";
    public boolean configured(){return enabled && apiKey!=null && !apiKey.isBlank() && model!=null && model.matches("[A-Za-z0-9._-]{1,100}");}
}
