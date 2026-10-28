package com.ancu.proptech.service.property;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
@Service
public class SmtpPropertyNoticeEmailSender implements PropertyNoticeEmailSender {
    private final JavaMailSender mail;private final boolean enabled;private final String from,username,password;
    public SmtpPropertyNoticeEmailSender(JavaMailSender mail,@Value("${app.mail.enabled:false}") boolean enabled,@Value("${app.mail.from:}") String from,@Value("${spring.mail.username:}") String username,@Value("${spring.mail.password:}") String password){this.mail=mail;this.enabled=enabled;this.from=from;this.username=username;this.password=password;}
    public boolean isConfigured(){return enabled&&!from.isBlank()&&!username.isBlank()&&!password.isBlank();}
    public void send(String destination,String propertyName,LocalDate expiresOn,boolean expired){
        if(!isConfigured())throw new IllegalStateException("Mail unavailable");
        var message=new SimpleMailMessage();message.setFrom(from);message.setTo(destination);
        message.setSubject(expired?"Quyền cho thuê đã hết hạn — An Cư":"Nhắc thời hạn quyền cho thuê — An Cư");
        message.setText("Tài sản: "+propertyName+"\nQuyền cho thuê có thời hạn đến hết ngày "+expiresOn+".\n"+(expired?"Hệ thống tạm ngừng nhận khách thuê mới. ":"")+"Vui lòng mở hồ sơ tài sản để gửi giấy tờ gia hạn cho Admin duyệt. Hợp đồng và lịch sử hiện có được giữ nguyên.");mail.send(message);
    }
}
