# Apps Script setup — safe working copy

Original Practice spreadsheet remains unchanged. The entire native spreadsheet was copied, preserving all five tabs. Metadata and sample records were read back from the copy.

Working copy: https://docs.google.com/spreadsheets/

Copy ID: `CLIENT_SPREADSHEET_ID`

1. Open the working copy on a computer. Select **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with the contents of `backend/Code_Working_Copy.txt`. Do not paste into the original spreadsheet’s script. If a copied Apps Script project contains other old `.gs` backend files with the same function names, replace the old backend rather than keeping both.
3. Save. In the function selector, choose `setupWorkingCopy` and click **Run**. Authorise access using the account that owns the working copy. This sets the copy ID and generates a signing secret privately in Script properties. It does not edit financial records.
4. Select **Project Settings → Script properties**. Add `ALLOWED_EMAILS` with the email address used to sign in to the private finance app. Use comma-separated addresses for any other approved users. Confirm `SPREADSHEET_ID` is the copy ID above. `SHARED_SECRET` has already been generated.
5. Select `initialisePractice` in the function selector and run it. It creates another full spreadsheet backup before appending supporting columns and tabs. Existing business records, formulas and Sheet5 are preserved. `LAST_BACKUP_ID` in Script properties identifies that backup.
6. Select **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then deploy. The web address accepts only signed requests; unsigned GETs return an authentication error rather than financial data. Do not remove the signature checks.
7. Copy the deployment URL ending `/exec`. The app server must be configured privately with `APPS_SCRIPT_URL` (this URL), `APPS_SCRIPT_SECRET` (the same Script property as `SHARED_SECRET`) and `ALLOWED_EMAILS` (the same approved list). Do not put secrets in the frontend, URL or a public document.

The supplied working-copy script refuses to open any spreadsheet ID other than the copy ID. Even an accidentally configured original ID will be rejected.

The sheet copy is ready; the script has not been installed, run or deployed. The finance app is not connected to it yet. Complete the steps above and real integration tests before entering live transactions. Use a private Drive folder for issued invoice PDFs and receipt attachments.

Your original is a preserved source/backup. Do not switch the integration back to it for testing.
