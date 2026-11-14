package com.ancu.proptech.service.ai;
import org.junit.jupiter.api.Test;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;
class AiImageSupportTests {
 @Test void reencodesAndBoundsImageDimensions()throws Exception{
  var out=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(2000,1000,BufferedImage.TYPE_INT_RGB),"png",out);
  var image=AiImageSupport.prepare(out.toByteArray());assertEquals("image/jpeg",image.mimeType());
  var raster=ImageIO.read(new java.io.ByteArrayInputStream(image.content()));assertEquals(1280,raster.getWidth());assertEquals(640,raster.getHeight());
 }
 @Test void rejectsNonImagesAndEmptyInput(){assertThrows(RuntimeException.class,()->AiImageSupport.prepare("not an image".getBytes()));assertThrows(RuntimeException.class,()->AiImageSupport.prepare(new byte[0]));}
}
