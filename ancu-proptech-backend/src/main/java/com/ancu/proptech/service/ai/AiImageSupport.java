package com.ancu.proptech.service.ai;

import com.ancu.proptech.exception.common.ApiException;
import org.springframework.http.HttpStatus;
import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.*;

/** Bounded raster decode and re-encode: never send metadata or an arbitrary URL to AI. */
public final class AiImageSupport {
    private AiImageSupport() {}
    public static AssistanceClient.Image prepare(byte[] bytes) {
        if(bytes.length==0||bytes.length>10*1024*1024)throw invalid();
        try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){
            var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())throw invalid();
            var reader=readers.next();
            try{
                reader.setInput(stream);String format=reader.getFormatName();
                if(!format.equalsIgnoreCase("png")&&!format.equalsIgnoreCase("jpeg"))throw invalid();
                int w=reader.getWidth(0),h=reader.getHeight(0);
                if(w<=0||h<=0||(long)w*h>20_000_000)throw invalid();
                double scale=Math.min(1,1280.0/Math.max(w,h));
                var raster=new BufferedImage(Math.max(1,(int)(w*scale)),Math.max(1,(int)(h*scale)),BufferedImage.TYPE_INT_RGB);
                var graphics=raster.createGraphics();
                try{graphics.setColor(Color.WHITE);graphics.fillRect(0,0,raster.getWidth(),raster.getHeight());graphics.drawImage(reader.read(0),0,0,raster.getWidth(),raster.getHeight(),null);}finally{graphics.dispose();}
                var out=new ByteArrayOutputStream();if(!ImageIO.write(raster,"jpeg",out)||out.size()>2_000_000)throw invalid();
                return new AssistanceClient.Image("image/jpeg",out.toByteArray());
            }finally{reader.dispose();}
        }catch(IOException e){throw invalid();}
    }
    private static ApiException invalid(){return new ApiException(HttpStatus.BAD_REQUEST,"INVALID_AI_IMAGE","Chỉ nhận ảnh JPEG/PNG hợp lệ, tối đa 20 triệu điểm ảnh.");}
}
