package com.ancu.proptech.config.auth;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.*;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
public class PrivateAccountCacheConfig implements WebMvcConfigurer {
    @Override public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(new HandlerInterceptor(){
        @Override public boolean preHandle(jakarta.servlet.http.HttpServletRequest request,jakarta.servlet.http.HttpServletResponse response,Object handler){response.setHeader("Cache-Control","no-store");return true;}
    }).addPathPatterns("/api/v1/me","/api/v1/me/profile","/api/v1/me/password","/api/v1/me/phone","/api/v1/me/email-change","/api/v1/me/email-changes/**");}
}
