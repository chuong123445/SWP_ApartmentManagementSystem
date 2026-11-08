-- Local fixtures have a distinct source and binding; they do not impersonate Auth0.
IF OBJECT_ID('dbo.CK_external_source','C') IS NOT NULL
    ALTER TABLE dbo.auth_external_identities DROP CONSTRAINT CK_external_source;
GO
ALTER TABLE dbo.auth_external_identities WITH CHECK ADD CONSTRAINT CK_external_source CHECK (
    source = 'AUTH0_VNEID_SIMULATION'
    OR (source = 'LOCAL_DEMO' AND issuer = 'urn:ancu:local-demo'
        AND subject = CONVERT(varchar(20), account_id))
);
GO
