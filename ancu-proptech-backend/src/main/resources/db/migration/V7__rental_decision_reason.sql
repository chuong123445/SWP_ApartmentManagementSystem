IF COL_LENGTH(N'dbo.rental_requests', N'decision_reason') IS NULL
    ALTER TABLE dbo.rental_requests ADD decision_reason nvarchar(2000) NULL;
GO
