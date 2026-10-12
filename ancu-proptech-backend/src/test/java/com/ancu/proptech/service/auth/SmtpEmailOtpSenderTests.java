package com.ancu.proptech.service.auth;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import java.io.*;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
class SmtpEmailOtpSenderTests {
    @Test void mailAdapterActuallySpeaksSmtpAndTransmitsOtpMessage()throws Exception{
        try(var server=new ServerSocket(0)){
            var executor=Executors.newSingleThreadExecutor();
            try{var received=executor.submit(()->{try(var socket=server.accept();var reader=new BufferedReader(new InputStreamReader(socket.getInputStream(),StandardCharsets.UTF_8));var writer=new PrintWriter(socket.getOutputStream(),true,StandardCharsets.UTF_8)){
                socket.setSoTimeout(5000);writer.println("220 localhost SMTP test");StringBuilder data=new StringBuilder();String line;boolean body=false;
                while((line=reader.readLine())!=null){if(body){if(line.equals(".")){body=false;writer.println("250 accepted");}else data.append(line).append('\n');}
                    else if(line.startsWith("DATA")){body=true;writer.println("354 send data");}else if(line.startsWith("QUIT")){writer.println("221 bye");break;}else writer.println("250 localhost");}return data.toString();}});
                var mail=new JavaMailSenderImpl();mail.setHost("127.0.0.1");mail.setPort(server.getLocalPort());mail.setDefaultEncoding("UTF-8");mail.getJavaMailProperties().put("mail.smtp.auth","false");
                var sender=new SmtpEmailOtpSender(mail,true,"sender@example.invalid","configured-user","configured-password");assertTrue(sender.isConfigured());sender.send("target@example.invalid","123456");String data=received.get(5,TimeUnit.SECONDS);assertTrue(data.contains("target@example.invalid"));assertTrue(data.contains("123456"));
            }finally{executor.shutdownNow();}
        }
    }
}
