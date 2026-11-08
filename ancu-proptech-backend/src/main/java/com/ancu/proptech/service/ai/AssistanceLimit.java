package com.ancu.proptech.service.ai;
import org.springframework.stereotype.Component;
import com.ancu.proptech.exception.common.ApiException;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.util.concurrent.Semaphore;
@Component public class AssistanceLimit {
 private record Window(long start,int count){}
 private final Map<String,Window> windows=new HashMap<>();private final Semaphore slots=new Semaphore(4);
 public synchronized AutoCloseable acquire(String key){
  long now=System.currentTimeMillis();windows.entrySet().removeIf(e->now-e.getValue().start()>60000);
  var w=windows.getOrDefault(key,new Window(now,0));
  if(w.count()>=10||windows.size()>=2000||!slots.tryAcquire())throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"AI_RATE_LIMIT","Đã đạt giới hạn lượt AI. Hãy thử lại sau một phút hoặc thao tác thông thường.");
  windows.put(key,new Window(w.start(),w.count()+1));return ()->slots.release();
 }
}
