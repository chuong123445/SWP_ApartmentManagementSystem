IF OBJECT_ID('dbo.rental_conversations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.rental_conversations (
        id bigint IDENTITY PRIMARY KEY,
        apartment_id bigint NOT NULL REFERENCES dbo.rental_apartments(id),
        customer_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),
        owner_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),
        last_message_at datetime2(6) NULL,
        CONSTRAINT uq_rental_conversation_parties UNIQUE (apartment_id, customer_id, owner_id),
        CONSTRAINT ck_rental_conversation_distinct_parties CHECK (customer_id <> owner_id)
    );
    CREATE INDEX ix_rental_conversation_customer ON dbo.rental_conversations(customer_id, last_message_at DESC, id DESC);
    CREATE INDEX ix_rental_conversation_owner ON dbo.rental_conversations(owner_id, last_message_at DESC, id DESC);
END;
GO
IF OBJECT_ID('dbo.rental_messages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.rental_messages (
        id bigint IDENTITY PRIMARY KEY,
        conversation_id bigint NOT NULL REFERENCES dbo.rental_conversations(id),
        sender_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),
        request_key varchar(36) NOT NULL,
        body nvarchar(2000) NOT NULL,
        sent_at datetime2(6) NOT NULL,
        CONSTRAINT uq_rental_message_request UNIQUE (conversation_id, sender_id, request_key)
    );
    CREATE INDEX ix_rental_message_history ON dbo.rental_messages(conversation_id, id DESC);
END;
GO
