# Handoff: Pending Shipment Proforma Query Website

## Goal

Replace an existing local Microsoft Access query form gradually with a public web query page.

The data source remains SharePoint Lists at:

`https://harveypharma.sharepoint.com/sites/HarveyPharma`

The website is in English. It shows **Pending Shipment Proforma Invoices**. The user clarified that this is **not** defined by outstanding quantity: a shipment can be sent before every item is checked in.

## Current Azure deployment

- Azure Static Web App URL: `https://brave-ground-0fbbaa90f.7.azurestaticapps.net`
- Environment: Production
- Plan: Free
- Portal status shown: Ready

At the original handoff, the user had reported that no pending-shipment proformas were loaded. The user subsequently confirmed that the website was working; the initial loading issue should not be treated as a currently confirmed failure.

During UI testing on 2026-08-28, the observed deployed page lacked the new sort icons. This historical observation does not establish today's deployment state. Current Azure deployment parity has not been verified in this documentation update.

Test endpoints:

```text
https://brave-ground-0fbbaa90f.7.azurestaticapps.net/api/pending-shipment-proformas
https://brave-ground-0fbbaa90f.7.azurestaticapps.net/api/check-in-status
```

Expected response shape:

```json
{ "data": [] }
```

If the first endpoint returns HTTP 500, inspect Azure Static Web Apps configuration values and Microsoft Graph permissions. If it returns an empty data array, verify List names and SharePoint field internal names.

## Frontend requirements

- All visible UI text must be English.
- The filter is a `<select>` dropdown labeled **Proforma Name**.
- Dropdown text: `check_in_lookup.invoice_name — check_in_lookup.invoice_no`.
- Dropdown value/API parameter: `check_in_lookup.invoice_no`.
- The details table columns are: `No.`, `Product Name`, `Proforma No.`, `Checked In`, `Outstanding`.
- `No.` follows the original `price_lists` order and starts at 1 only when a single Proforma Name has been selected. If the dropdown is left at “All pending shipment proformas”, leave the No. column blank. Sorting other columns must not change the displayed No. value.
- Default result order must preserve the order returned from `price_lists`; do not sort server-side by default.
- Every table column is sortable ascending/descending by clicking its header. Sorting is client-side and should affect the Excel export.
- **Export to Excel** downloads the current filtered and sorted table result as an `.xlsx` file.
- **Clear** is a local-only reset: select `All pending shipment proformas`, clear the table, reset all three summary values to `0`, clear sorting, disable export and show `Ready`. It must not call the details API or automatically retrieve all-proforma results.
- A negative `waiting` value is displayed and exported as `absolute value (Extra)`, for example `-5` is shown as `5 (Extra)`. Sorting continues to use the original numeric value.
- The app calls these same-origin routes:
  - `/api/pending-shipment-proformas`
  - `/api/check-in-status?proformaNo=<invoice_no>`

Files:

- `index.html`
- `app.js`
- `styles.css`

## Data rules

SharePoint List/field names currently assumed by the implementation:

| List | Required fields |
| --- | --- |
| `check_in_lookup` | `invoice_no`, `invoice_name` |
| `price_lists` | `invoice_no`, `product_name`, `quantity` |
| `check_in_items` | `proforma_no`, `product_name`, `quantity` |

Important business rule:

```text
A proforma is included when its invoice_no exists in check_in_lookup
and it has matching price_lists lines.
```

Do **not** filter proformas by `waiting > 0`. `waiting` is only displayed:

```text
checked in = SUM(check_in_items.quantity)
             grouped by proforma_no + product_name

outstanding = price_lists.quantity - checked in
```

`check_in_lookup` is treated as the source of truth for pending-shipment eligibility.

## Azure Functions implementation

The project was migrated from Vercel to Azure Static Web Apps and Azure Functions Node.js v4.

| Path | Purpose |
| --- | --- |
| `api/src/functions/pending-shipment-proformas.js` | Dropdown endpoint |
| `api/src/functions/check-in-status.js` | Details endpoint |
| `api/src/shared/sharepoint.js` | Microsoft Graph token and List reads |
| `api/src/shared/proformas.js` | Join, aggregation and display calculation |
| `api/package.json` | Azure Functions v4 dependency/configuration |
| `staticwebapp.config.json` | Static Web Apps settings, including `node:22` API runtime |
| `api/local.settings.json.example` | Local-only settings template |

Functions use public HTTP routes because the user asked for a website query page accessible by URL. The Microsoft Graph client secret remains server-side.

## Entra / Microsoft Graph setup

An Entra app was created by the user. It should have:

- Single tenant: `Harvey Pharma Ltd`
- Microsoft Graph **Application permission**: `Sites.Read.All`
- Admin consent granted
- A client secret created

The original least-privilege `Sites.Selected` plan was abandoned because the user could not complete the PnP site-grant command. `Sites.Read.All` means the app can read SharePoint Lists across the tenant, so the secret must be tightly protected.

Do not ask the user to paste the secret into a chat, repository, or source code.

## Required Azure Static Web Apps application settings

Add these values in Azure Portal → Static Web App → Configuration → Application settings:

```text
AZURE_TENANT_ID=<Directory (tenant) ID>
AZURE_CLIENT_ID=<Application (client) ID>
AZURE_CLIENT_SECRET=<client secret VALUE, not secret ID>
SHAREPOINT_HOSTNAME=harveypharma.sharepoint.com
SHAREPOINT_SITE_PATH=/sites/HarveyPharma
CHECK_IN_LOOKUP_LIST=check_in_lookup
PRICE_LISTS_LIST=price_lists
CHECK_IN_ITEMS_LIST=check_in_items
```

For managed Static Web App functions, do not manually set `AzureWebJobsStorage` or `FUNCTIONS_WORKER_RUNTIME` in the Static Web App application settings.

## Deployment configuration

Azure Static Web Apps GitHub workflow settings must be:

```yaml
app_location: "/"
api_location: "api"
output_location: ""
```

The root project has no Vercel configuration anymore. Vercel-specific files were removed.

## Suggested debugging sequence

1. Call `/api/pending-shipment-proformas` directly.
2. If HTTP 500:
   - Confirm all 8 Azure application settings exist and have no accidental spaces.
   - Confirm `Sites.Read.All` is **Application**, not Delegated, and admin consent is granted.
   - Check Azure Functions/Static Web Apps runtime logs if available.
3. If `{ "data": [] }`:
   - Confirm that `CHECK_IN_LOOKUP_LIST`, `PRICE_LISTS_LIST`, and `CHECK_IN_ITEMS_LIST` are real SharePoint List display names or replace them with actual List GUIDs.
   - Confirm actual SharePoint internal column names. SharePoint may change internal names when a column was renamed after creation.
   - Confirm `check_in_lookup` rows have non-empty `invoice_no` values matching `price_lists.invoice_no` exactly.
4. Once dropdown data works, call the details endpoint with one returned `invoice_no`.
5. Test the deployed page and confirm the left `No.` column logic.

## Current non-goals

- No Azure SQL/MySQL sync is implemented.
- No 5-minute synchronization job is implemented.
- No website login/password is implemented.
- No write/update functionality is implemented; API is read-only.

## Change-recording and version policy

Update both this handoff and `README.md` after every change, including behavior, affected areas and verification results or limitations. Append changes to **Unversioned** with the actual change date. Only assign a version when the user explicitly asks; at that point, group all accumulated unversioned changes under the requested version without losing their individual records. Do not automatically increment versions, create Git tags, or infer a deployment from a version label.

The user assigned **V1** to the baseline through the original handoff message describing the Azure address, structure, SharePoint/Entra settings, rules, open items and troubleshooting. Subsequent changes through 2026-09-03 are **V1.1**. The accumulated changes from 2026-09-04 and 2026-09-05 are assigned to **V1.1.1**. These groups reconstruct known conversation history; they are not claims of exact deployment dates or complete per-commit provenance.

## Change log

### V1.1.1 — 2026-09-05

**Summary:** Stabilize row numbering and make Clear a local-only reset.

**Description:** V1.1.1 preserves each row's original `price_lists` number in the table and Excel export even when another column is sorted. Clear now resets the interface to its initial state without calling the details API or loading the all-proforma result set.

Changes assigned to this version:

#### 2026-09-04

- **Stable row numbers (`app.js`):** table rendering and Excel export now use each row's original `price_lists` position, not its position after sorting. Sorting another column must not renumber the row; the All view remains unnumbered.
- **Historical Clear explanation (README and handoff):** Clear was documented at that point as resetting to All and rerunning that query. The behavior was superseded by the local-only reset on 2026-09-05.
- **History and policy (README and handoff):** backfilled V1/V1.1 as requested, moved today's stable-number change out of the old August entry, and corrected the stale loading/deployment notes. Documentation-only update; no application code changes or deployment in this update. Documentation consistency and whitespace are checked locally; this does not verify live behavior.

#### 2026-09-05

- **Local-only Clear (`app.js`, `index.html`):** Clear now restores the dropdown to `All pending shipment proformas`, removes current table rows, resets Product Lines / Checked In / Outstanding to `0`, clears the active sort and restores its initial direction, disables Excel export, and sets status to `Ready`.
- **No all-data request:** the Clear handler no longer calls `search()` and therefore does not request `/api/check-in-status`. It leaves the already-loaded dropdown options intact.
- **Empty state:** after Clear, the table displays the initial “Select a proforma name and search.” prompt instead of the no-results message.
- **Verification:** `app.js` passed `node --check`; source checks confirmed that the Clear handler is bound only to `clearResults`. No Azure deployment or live-site verification was performed in this update.
- **Version metadata (`api/package.json`, README and handoff):** assigned all accumulated 2026-09-04/05 changes to V1.1.1 and aligned the API package version. No Git tag or Azure deployment was created. Put future changes under **Unversioned** until the user supplies the next version number.

### V1.1 — after the original handoff through 2026-09-03

The functional changes below were recorded after the original handoff, principally on 2026-08-27/28:

- **Sorting (`app.js`, `index.html`, `styles.css`):** added ascending/descending sorting for displayed columns. Later refined the arrows to paired CSS triangles with a highlighted active direction and accessible sort state.
- **Default order (`api/src/functions/check-in-status.js`, `app.js`):** removed the default invoice/product sort; retain the returned `price_lists` sequence until a header is clicked. This preserves API input order, not necessarily a custom SharePoint view's ordering.
- **Excel export (`app.js`, `index.html`):** added browser-generated `.xlsx` export of the current filtered and sorted rows using SheetJS. Outstanding uses formatted display text in the export.
- **Dropdown (`app.js`, `index.html`):** show `invoice_name — invoice_no`, but send only `invoice_no` for searches. Removed “The menu shows invoice_name; its selected value is invoice_no.”
- **Extra quantities (`app.js`):** display negative Outstanding values as absolute quantities followed by `(Extra)` in the table, summary and export; retain signed numbers for sorting.
- **Documentation:** adopted the user's requirement to update README and handoff after every change.
- **Verification:** syntax checks passed for `app.js` and the check-in-status route. Mock API checks preserved input order (Second then First) and a negative `waiting` value of -2. The observed Azure page lacked the updated sort icons, so the new sorting and download were not fully verified there. A blocked local browser check was not bypassed.
- **Read-only audit (2026-08-30):** the `.github` workflow content matched HEAD despite its changed timestamp. Examined pending changes were consistent with earlier work, but Git/timestamps could not prove that nobody else had edited the files. This audit did not itself change the workflow.

### V1 — baseline through the original handoff

- **Initial English frontend:** Pending Shipment Proforma Invoices title; Proforma Name dropdown displaying `invoice_name` and submitting `invoice_no`; product/quantity results with numbers starting at 1 for a selected proforma and blank numbers for All.
- **Business rules and SharePoint reads:** join `check_in_lookup`, `price_lists` and `check_in_items`; require lookup eligibility and matching price lines; aggregate checked-in quantities and calculate Outstanding. Removed the mistaken interpretation that pending shipment requires `waiting > 0`.
- **Azure migration:** replaced the Vercel API structure with Azure Static Web Apps and Azure Functions Node.js v4, the two query routes, shared Microsoft Graph access, Node 22 runtime configuration and deployment/local-settings guidance.
- **Entra setup:** documented single-tenant application access and server-side credentials. The user chose Graph Application `Sites.Read.All` with admin consent after the `Sites.Selected` per-site grant attempt did not work.
- **Initial deployment and handoff:** recorded the Azure URL and portal status, project structure, SharePoint/Entra settings, business rules, incomplete loading investigation and troubleshooting steps. No client secret was included. The user later reported the site was working.

## Future architecture (optional)

If complex SQL/reporting or a 5-minute cache is needed later:

```text
SharePoint Lists -> Microsoft Graph delta sync -> Azure Functions timer -> Azure SQL
Website -> Azure Static Web Apps API -> Azure SQL
```

Use Microsoft Graph delta queries rather than repeatedly reading all List items.
