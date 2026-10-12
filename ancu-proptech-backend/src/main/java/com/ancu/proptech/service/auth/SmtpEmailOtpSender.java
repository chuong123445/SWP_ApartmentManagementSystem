package com.ancu.proptech.service.auth;
import com.ancu.proptech.exception.auth.AuthException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
@Service
public class SmtpEmailOtpSender implements EmailOtpSender {
    private final JavaMailSender mail;
    private final boolean enabled;
    private final String from,username,password;
    public SmtpEmailOtpSender(JavaMailSender mail,@Value("${app.mail.enabled:false}") boolean enabled,
            @Value("${app.mail.from:}") String from,@Value("${spring.mail.username:}") String username,@Value("${spring.mail.password:}") String password){this.mail=mail;this.enabled=enabled;this.from=from;this.username=username;this.password=password;}
    @Override public boolean isConfigured(){return enabled&&!from.isBlank()&&!username.isBlank()&&!password.isBlank();}
    @Override public void send(String destination,String code){
        if(!isConfigured())throw unavailable();
        SimpleMailMessage message=new SimpleMailMessage();message.setFrom(from);message.setTo(destination);
        message.setSubject("Mã xác minh email An Cư PropTech");
        message.setText("Mã xác minh email của bạn: "+code+"\nMã có hiệu lực 10 phút. Không chia sẻ mã với người khác.\nNếu bạn không thực hiện thao tác này, hãy bỏ qua email.");
        try{mail.send(message);}catch(MailException e){throw unavailable();}
    }
    private static AuthException unavailable(){return new AuthException(HttpStatus.SERVICE_UNAVAILABLE,"OTP_DELIVERY_UNAVAILABLE","Chưa gửi được OTP email. Vui lòng kiểm tra cấu hình SMTP hoặc thử lại sau.");}
}
