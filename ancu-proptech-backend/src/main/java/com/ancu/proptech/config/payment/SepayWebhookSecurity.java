package com.ancu.proptech.config.payment;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
@Configuration
public class SepayWebhookSecurity {
 @Bean @Order(0) SecurityFilterChain sepayWebhook(HttpSecurity http)throws Exception {
  // Webhook máy chủ xác thực API key trong service, không dùng cookie hay JWT người dùng.
  return http.securityMatcher("/api/v1/payments/sepay/webhooks/*")
   .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
   .csrf(c->c.disable()).requestCache(c->c.disable()).formLogin(c->c.disable()).httpBasic(c->c.disable()).logout(c->c.disable())
   .authorizeHttpRequests(a->a.requestMatchers(org.springframework.http.HttpMethod.POST,"/api/v1/payments/sepay/webhooks/*").permitAll().anyRequest().denyAll()).build();
 }
}
