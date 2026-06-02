CREATE TABLE IF NOT EXISTS pharmacy_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pharmacy_documents_type_check CHECK (
        document_type IN (
            'DRUG_LICENSE',
            'GST',
            'SHOP_REGISTRATION',
            'OWNER_KYC',
            'PHARMACIST_CERTIFICATE',
            'BANK_ACCOUNT',
            'INVOICE_FORMAT',
            'RETURN_POLICY',
            'PLATFORM_AGREEMENT',
            'PENALTY_AGREEMENT',
            'PRESCRIPTION_COMPLIANCE_DECLARATION',
            'OTHER'
        )
    ),
    CONSTRAINT pharmacy_documents_status_check CHECK (
        status IN (
            'SUBMITTED',
            'VERIFIED',
            'REJECTED'
        )
    )
);

CREATE INDEX IF NOT EXISTS pharmacy_documents_pharmacy_id_idx
    ON pharmacy_documents (pharmacy_id);

CREATE INDEX IF NOT EXISTS pharmacy_documents_status_idx
    ON pharmacy_documents (status);

DROP TRIGGER IF EXISTS pharmacy_documents_set_updated_at ON pharmacy_documents;
CREATE TRIGGER pharmacy_documents_set_updated_at
BEFORE UPDATE ON pharmacy_documents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
