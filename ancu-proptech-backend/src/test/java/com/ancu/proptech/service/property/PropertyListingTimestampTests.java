package com.ancu.proptech.service.property;

import com.ancu.proptech.model.property.PropertyListingDraft;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.dialect.SQLServerDialect;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PropertyListingTimestampTests {
    @Test void draftTimestampDdlMatchesExistingSqlServerMigration() {
        var registry=new StandardServiceRegistryBuilder()
                .applySetting("hibernate.dialect",SQLServerDialect.class.getName())
                .applySetting("hibernate.boot.allow_jdbc_metadata_access",false)
                .build();
        try {
            var metadata=new MetadataSources(registry).addAnnotatedClass(PropertyListingDraft.class).buildMetadata();
            var column=metadata.getEntityBinding(PropertyListingDraft.class.getName()).getProperty("updatedAt").getColumns().getFirst();
            assertEquals("datetime2(6)",column.getSqlType(metadata));
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }
}
