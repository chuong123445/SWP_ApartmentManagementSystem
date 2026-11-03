package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.property.*;
import org.springframework.http.HttpStatus;
import java.util.*;
import static com.ancu.proptech.service.auth.AccountService.error;

/** Validate a nonempty subset by stable source IDs, not editable room labels. */
final class SourceRoomSelection {
    private SourceRoomSelection() {}
    static Map<String,VneidPropertyImportRequest.Unit> terms(VneidAsset source,List<VneidPropertyImportRequest.Unit> input,Set<String> imported) {
        var result=new LinkedHashMap<String,VneidPropertyImportRequest.Unit>();
        var allowed=new HashSet<>(source.units().stream().map(VneidAsset.Unit::externalUnitId).toList());
        if(input==null||input.isEmpty())throw invalid();
        for(var unit:input){
            if(unit==null||!allowed.contains(unit.getExternalUnitId())||result.put(unit.getExternalUnitId(),unit)!=null)throw invalid();
            if(imported.contains(unit.getExternalUnitId()))throw error(HttpStatus.CONFLICT,"SOURCE_UNIT_ALREADY_IMPORTED","Phòng đã có trong hệ thống. Hãy tải lại danh sách.");
        }
        return result;
    }
    static boolean sameLegalSource(VneidAsset a,VneidAsset b) {
        return Objects.equals(a.externalAssetId(),b.externalAssetId())&&Objects.equals(a.name(),b.name())
            &&Objects.equals(a.address(),b.address())&&Objects.equals(a.rentalMode(),b.rentalMode())
            &&Objects.equals(a.certificateNumber(),b.certificateNumber())&&Objects.equals(a.certificateDate(),b.certificateDate())
            &&Objects.equals(a.certificatePlace(),b.certificatePlace())&&Objects.equals(a.rightDescription(),b.rightDescription());
    }
    private static RuntimeException invalid(){return error(HttpStatus.BAD_REQUEST,"ASSET_UNITS_MISMATCH","Chọn ít nhất một phòng hợp lệ, không trùng mã nguồn, và điền đủ điều kiện cho các phòng đã chọn.");}
}
