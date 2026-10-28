package com.ancu.proptech.config.contract;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.*;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
public class PrivateContractCacheConfig implements WebMvcConfigurer {
    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(jakarta.servlet.http.HttpServletRequest request,jakarta.servlet.http.HttpServletResponse response,Object handler) {
                response.setHeader("Cache-Control","no-store");return true;
            }
        }).addPathPatterns("/api/v1/owner/rental-requests/*/contract-context","/api/v1/owner/rental-requests/*/contract",
            "/api/v1/owner/contract-drafts","/api/v1/me/contract-drafts","/api/v1/contracts/*","/api/v1/contracts/*/pdf","/api/v1/contracts/*/signatures","/api/v1/owner/contracts/**","/api/v1/contracts/*/handover/confirm");
    }
}
