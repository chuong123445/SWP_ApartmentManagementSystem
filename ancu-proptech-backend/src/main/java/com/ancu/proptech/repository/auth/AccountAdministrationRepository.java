package com.ancu.proptech.repository.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Set;

@Repository
@RequiredArgsConstructor
public class AccountAdministrationRepository {
    private final JdbcTemplate jdbc;

    // Only authentication/session artifacts can be removed with an otherwise empty account.
    private static final Set<String> TECHNICAL_TABLES = Set.of(
            "auth_sessions", "auth_refresh_tokens", "email_change_challenges",
            "account_reauthentications", "notification_reads", "auth_account_roles");

    private record Reference(String table, String column, String quotedTable, String quotedColumn) {}

    private List<Reference> references() {
        // Include real FKs and the account ID columns used by older tables without FKs.
        // Identifier quoting comes from SQL Server's catalog, never from request input.
        return jdbc.query("""
                SELECT DISTINCT t.name, c.name,
                    QUOTENAME(s.name) + '.' + QUOTENAME(t.name) AS quoted_table,
                    QUOTENAME(c.name) AS quoted_column
                FROM sys.tables t
                JOIN sys.schemas s ON s.schema_id = t.schema_id
                JOIN sys.columns c ON c.object_id = t.object_id
                WHERE t.is_ms_shipped = 0 AND s.name = 'dbo'
                  AND t.name NOT IN ('auth_accounts', 'admin_account_events')
                  AND (
                    EXISTS (SELECT 1 FROM sys.foreign_key_columns fk
                            WHERE fk.parent_object_id = t.object_id AND fk.parent_column_id = c.column_id
                              AND fk.referenced_object_id = OBJECT_ID('dbo.auth_accounts'))
                    OR (TYPE_NAME(c.system_type_id) IN ('bigint','int','smallint')
                        AND c.name IN ('account_id','owner_id','customer_id','tenant_id','user_id',
                                       'uploader_id','reporter_id','recipient_id','reviewer_id','actor_id',
                                       'processing_admin_id','handled_by_id','created_by','updated_by',
                                       'saved_by','posted_by','cancelled_by','requested_by'))
                  )
                ORDER BY t.name, c.name
                """, (rs, row) -> new Reference(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4)));
    }

    public boolean hasBusinessHistory(Long accountId) {
        for (var reference : references()) {
            if (TECHNICAL_TABLES.contains(reference.table())) continue;
            String sql = "SELECT CASE WHEN EXISTS (SELECT 1 FROM " + reference.quotedTable()
                    + " WITH (UPDLOCK,HOLDLOCK) WHERE " + reference.quotedColumn() + " = ?) THEN 1 ELSE 0 END";
            if (Integer.valueOf(1).equals(jdbc.queryForObject(sql, Integer.class, accountId))) return true;
        }
        return false;
    }

    public void deleteTechnicalArtifacts(Long accountId) {
        for (var reference : references()) {
            if (!TECHNICAL_TABLES.contains(reference.table()) || reference.table().equals("auth_sessions")) continue;
            jdbc.update("DELETE FROM " + reference.quotedTable() + " WHERE " + reference.quotedColumn() + " = ?", accountId);
        }
        jdbc.update("""
                DELETE FROM dbo.auth_refresh_tokens
                WHERE session_id IN (SELECT id FROM dbo.auth_sessions WHERE account_id = ?)
                """, accountId);
        jdbc.update("DELETE FROM dbo.auth_sessions WHERE account_id = ?", accountId);
    }

    public void deleteBlankAccount(Long accountId) {
        jdbc.update("DELETE FROM dbo.auth_accounts WHERE id = ?", accountId);
    }

    public void revokeSessions(Long accountId) {
        jdbc.update("UPDATE dbo.auth_sessions SET revoked_at = SYSUTCDATETIME() WHERE account_id = ? AND revoked_at IS NULL", accountId);
    }

    public void audit(Long actor, Long target, String email, String outcome, String reason) {
        // target_account_id is intentionally a historical reference, allowing audited hard deletion.
        jdbc.update("""
                INSERT INTO dbo.admin_account_events
                    (actor_id,target_account_id,target_email,outcome,reason,created_at)
                VALUES (?,?,?,?,?,SYSUTCDATETIME())
                """, actor, target, email, outcome, reason);
    }
}
