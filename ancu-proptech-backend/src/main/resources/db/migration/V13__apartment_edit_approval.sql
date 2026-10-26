-- Add edit_approval_status column to rental_apartments to track pending sensitive edits.
IF COL_LENGTH('dbo.rental_apartments','edit_approval_status') IS NULL
    ALTER TABLE dbo.rental_apartments
        ADD edit_approval_status varchar(24) NOT NULL CONSTRAINT df_apt_edit_approval_status DEFAULT 'NONE';
GO
-- Pending sensitive-field edits awaiting admin approval.
-- One-to-one with rental_apartments; row exists only when there is an outstanding edit.
IF OBJECT_ID(N'dbo.apartment_pending_edits', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.apartment_pending_edits (
        apartment_id            uniqueidentifier NOT NULL PRIMARY KEY
                                    REFERENCES dbo.rental_apartments(id),
        advertised_monthly_rent decimal(15,2)    NULL,
        deposit                 decimal(15,2)    NULL,
        electricity_index       int              NULL,
        water_index             int              NULL,
        area_m2                 decimal(12,2)    NULL,
        requested_at            datetime2(6)     NOT NULL,
        requested_by_owner_id   uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id)
    );
END;
GO
