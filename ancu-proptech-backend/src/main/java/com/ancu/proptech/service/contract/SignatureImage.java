package com.ancu.proptech.service.contract;

import com.ancu.proptech.exception.common.ApiException;
import org.springframework.http.HttpStatus;
import javax.imageio.ImageIO;
import java.io.*;
import java.util.Base64;

final class SignatureImage {
    private SignatureImage() {}
    static byte[] normalize(String value) {
        try {
            if (value == null || value.length() > 200000 || !value.startsWith("data:image/png;base64,")) throw new IOException();
            byte[] bytes = Base64.getDecoder().decode(value.substring(22));
            if (bytes.length > 150000) throw new IOException();
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new IOException();
                var reader = readers.next();
                try {
                    reader.setInput(input);
                    int w = reader.getWidth(0), h = reader.getHeight(0);
                    if (!"png".equalsIgnoreCase(reader.getFormatName()) || w < 64 || h < 32 || w > 1800 || h > 800 || (long)w*h > 1440000) throw new IOException();
                    var image = reader.read(0);
                    int ink = 0;
                    for (int y=0;y<h;y++) for(int x=0;x<w;x++) {
                        int pixel=image.getRGB(x,y);
                        if ((pixel>>>24)>64 && ((pixel>>16)&255)<220 && ((pixel>>8)&255)<220 && (pixel&255)<220) ink++;
                    }
                    if (ink < 30) throw new IOException();
                    var out = new ByteArrayOutputStream();
                    ImageIO.write(image,"png",out);
                    return out.toByteArray();
                } finally { reader.dispose(); }
            }
        } catch (IOException | IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_SIGNATURE","Chữ ký trống hoặc không hợp lệ. Vui lòng ký lại trong khung.");
        }
    }
}
