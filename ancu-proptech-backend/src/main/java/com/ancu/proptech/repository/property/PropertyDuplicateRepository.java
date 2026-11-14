package com.ancu.proptech.repository.property;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Repository @RequiredArgsConstructor
public class PropertyDuplicateRepository {
    private final JdbcTemplate jdbc;

    @Transactional(propagation=Propagation.MANDATORY)
    public boolean lockApproval() {
        Integer result=jdbc.queryForObject("""
            -- EXEC alone does not start SQL Server's implicit JDBC transaction.
            -- Read an empty indexed range first, using the same Spring-bound
            -- connection. Do not create nested transactions or session locks.
            DECLARE @probe bigint;
            SELECT @probe=COUNT_BIG(*) FROM dbo.rental_properties WHERE id=-1;
            DECLARE @result int;
            EXEC @result = sys.sp_getapplock @Resource=N'ancu-property-certificate-approval',
                @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
            SELECT @result;
            """,Integer.class);
        return result!=null && result>=0;
    }

    public List<String> approvedCertificates(Long propertyId) {
        return jdbc.queryForList("""
            SELECT d.certificate_number FROM property_dossiers d JOIN rental_properties p ON p.id=d.property_id
            WHERE d.status='APPROVED' AND p.approval_status='APPROVED' AND p.id<>? AND d.certificate_number IS NOT NULL
            UNION ALL
            SELECT JSON_VALUE(i.source_snapshot,'$.certificateNumber') FROM property_external_imports i
            JOIN rental_properties p ON p.id=i.property_id
            WHERE p.approval_status='APPROVED' AND p.id<>? AND ISJSON(i.source_snapshot)=1
            """,String.class,propertyId,propertyId);
    }

    public boolean approvedEvidenceMatches(Long propertyId,Long fileId) {
        Integer count=jdbc.queryForObject("""
            SELECT COUNT(*) FROM property_dossier_files df
            JOIN property_dossiers d ON d.id=df.dossier_id
            JOIN rental_properties p ON p.id=d.property_id
            JOIN property_evidence_files f ON f.id=df.file_id
            JOIN property_evidence_content c ON c.id=f.id
            JOIN property_evidence_content incoming ON incoming.id=?
            WHERE d.status='APPROVED' AND p.approval_status='APPROVED' AND p.id<>?
                AND f.purpose='RIGHT_DOCUMENT'
                AND HASHBYTES('SHA2_256',c.content)=HASHBYTES('SHA2_256',incoming.content)
            """,Integer.class,fileId,propertyId);
        return count!=null && count>0;
    }
}
