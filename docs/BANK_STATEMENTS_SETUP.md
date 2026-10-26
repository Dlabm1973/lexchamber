# Financial statements and bank accounts

Use the safe working copy. The original spreadsheet is unchanged.

## Apply this upgrade

1. In the practice app, open Settings and download **current Apps Script code** (or use backend/Code_Working_Copy.txt).
2. In the working-copy spreadsheet choose Extensions → Apps Script. Replace Code.gs with the downloaded code. Preserve Script properties: SPREADSHEET_ID, SHARED_SECRET and ALLOWED_EMAILS.
3. Run initialisePractice. It makes a complete Drive backup before appending accountId, statementId and fingerprint to Transactions and creating BankAccounts and BankStatements. Existing values, formulas and unrelated columns are retained.
4. Deploy → Manage deployments → Edit → New version → Deploy. Retain the existing /exec URL.
5. Refresh the practice app. In Settings enter a dedicated private Google Drive folder ID if not already configured. Files are created with private access; never configure a publicly shared folder.
6. Financial Statements → Add bank account. Create the cheque account and credit-card account separately. Supply the actual opening date and balance. Credit-card debt is negative. The opening balance is immediately before that date. Each new account creates a backed-up Bank_<stable account suffix> tab.

## Import statements

Choose Upload statement next to the account. PDF statements are stored privately as source documents and marked AWAITING_EXTRACTION. PDF uploads alone do not create ledger entries. This version does not automatically extract or decrypt PDF statements. Use the bank's CSV export, or transcribe a PDF to CSV and review it before import. Do not store PDF passwords in the spreadsheet.

CSV files: header row, date, description, signed amount (positive received/negative paid) or separate debit and credit columns. Optional reference. Choose the delimiter's decimal convention in column mapping. Dates must be DD/MM/YYYY or YYYY-MM-DD. Maximum 500 rows per reviewed file; split larger files. Maximum source size 5 MB.

Check the sign convention for credit-card exports: spending is negative and repayments positive. Review every suggested classification. Transfers, personal entries and REVIEW items are excluded from practice income and expenditure. REVIEW means excluded pending confirmation, not zero spending.

The original source is stored first. Reviewed rows are imported in acknowledged batches. A fingerprint includes account, date, description, signed amount, reference and identical-row occurrence. Reimporting the same file or matching overlapping entries is skipped. Overlapping statements containing multiple identical same-day transactions without unique bank references require review because occurrence counts may differ. Manual legacy transactions without an account must be reconciled before reimporting the same period; they cannot be identified automatically as duplicates.

Transactions is the authoritative combined ledger. Per-account tabs are automatically synchronised from app ledger writes and are registers, not additional report inputs. Edit classifications in Transactions or the app, not the account mirror tabs. Manual changes to mirror tabs are not merged back into Transactions. App imports do not allocate bank receipts to invoices automatically, and do not change historical cumulative payment balances.

## Financial statements

Financial Statements offers date-filtered cash income and expenditure by category, cash surplus, a bank balance schedule, current debtor balances, reviewed additional assets/liabilities/capital and PDF/CSV exports. The financial-year shortcut starts on 1 March.

These are draft schedules, not final financial statements or a tax return. Balance sheet completeness, depreciation, accruals, asset disposal, VAT and tax adjustments require reviewed information. No income tax is calculated or filed. Historical debtor balances cannot be reconstructed from cumulative historical payments, so current debtor balances are displayed only when the ending date is today.

Calculated bank balances include all imported movements, including transfers and personal spending. They must be reconciled against bank statements. No opening balance is inferred from a statement. The account import ledger must be complete from its opening date.

Existing malformed transaction dates remain excluded until corrected from source evidence. Historical paid summaries are not added again to income; only recorded INCOME transactions contribute to cash receipts. Original invoice values and PDFs remain preserved.

## Mapping

BankAccounts: id, name, kind, lastFour, openingDate, openingBalance, sheetName, archived, version.

BankStatements: id, accountId, fileId, name, sha256, uploadedAt, status, importedCount, version.

Transactions gains accountId, statementId, fingerprint. Private source file references are registered in Documents. All account changes and imports use Operations/OperationParts with Audit and readback verification.

Settings.financialPosition contains an as-at date and reviewed Asset, Liability and Capital entries. It does not replace ledger data or assume a balancing capital amount.
