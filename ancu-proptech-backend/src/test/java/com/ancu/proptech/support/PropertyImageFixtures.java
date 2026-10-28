package com.ancu.proptech.support;
import com.ancu.proptech.model.property.PropertyImage;
import com.ancu.proptech.repository.property.PropertyImageRepository;
import java.time.Instant;
public final class PropertyImageFixtures {
    public static Long stage(PropertyImageRepository images,Long account){
        var i=new PropertyImage();i.setUploaderId(account);i.setContentType("image/png");i.setCreatedAt(Instant.now());
        i.setContent(java.util.Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="));
        return images.saveAndFlush(i).getId();
    }
}
