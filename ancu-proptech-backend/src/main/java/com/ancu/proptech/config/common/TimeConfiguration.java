package com.ancu.proptech.config.common;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
public class TimeConfiguration {
 @Bean public Clock contractExitClock(){return Clock.systemUTC();}
}
