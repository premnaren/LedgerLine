-- Add DB-level CHECK constraint on Account
ALTER TABLE "Account" ADD CONSTRAINT "no_negative_balance" CHECK ("balancePence" >= -"overdraftLimit");

-- Create trigger function to reject UPDATE or DELETE on LedgerEntry
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

-- Create trigger on LedgerEntry
CREATE TRIGGER prevent_ledger_mutation
BEFORE UPDATE OR DELETE ON "LedgerEntry"
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_mutation();

