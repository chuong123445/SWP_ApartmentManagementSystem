package com.ancu.proptech.service.apartment;
import com.ancu.proptech.dto.apartment.AddressOption;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class PublicCityNamesTests {
 private final List<AddressOption> options=List.of(new AddressOption("TP. Đà Nẵng","Hải Châu",null),new AddressOption("Đà Nẵng","Sơn Trà",null));
 @Test void equivalentNamesResolveOnlyAgainstPublicCatalog(){
  for(String name:List.of("Thành phố Đà Nẵng","TP. Đà Nẵng","tp da nang","Đà Nẵng","DA NANG"))assertEquals("Đà Nẵng",PublicCityNames.canonical(name,options));
  assertNull(PublicCityNames.canonical("Hà Nội",options));
  assertEquals("TP. Đà Nẵng",PublicCityNames.canonical("Đà Nẵng",List.of(options.getFirst())));
 }
 @Test void canonicalRequestPreservesBudgetAndNegation(){
  assertEquals("Tìm căn hộ ở Đà Nẵng dưới 10 triệu",PublicCityNames.request("Tìm căn hộ ở thành phố Đà Nẵng dưới 10 triệu",options));
  assertEquals("Không tìm ở Đà Nẵng",PublicCityNames.request("Không tìm ở TP. Đà Nẵng",options));
  assertEquals("Tìm ở thành phố Hà Nội",PublicCityNames.request("Tìm ở thành phố Hà Nội",options));
 }
}
