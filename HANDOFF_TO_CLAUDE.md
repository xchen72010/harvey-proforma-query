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

The Azure website was deployed, but the user reported that no pending-shipment proformas were loaded. The next developer should diagnose the deployed API first.

The deployed site was checked again on 2026-08-28 during UI testing and still served a pre-update page (no new sort icons). The latest local source changes have not yet been pushed/deployed to Azure.

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
- `No.` starts at 1 only when a single Proforma Name has been selected. If the dropdown is left at “All pending shipment proformas”, leave the No. column blank.
- Default result order must preserve the order returned from `price_lists`; do not sort server-side by default.
- Every table column is sortable ascending/descending by clicking its header. Sorting is client-side and should affect the Excel export.
- **Export to Excel** downloads the current filtered and sorted table result as an `.xlsx` file.
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

## Change log

### 2026-08-28

- Migrated the website API from the Vercel project structure to Azure Static Web Apps + Azure Functions Node.js v4.
- Added table sorting for every displayed column, with visual ascending/descending indicators.
- Added client-side Excel export for the active filtered/sorted result set.
- Changed dropdown labels to show both invoice name and invoice number while sending only invoice number to the API.
- Removed default server-side sorting so the initial display preserves the `price_lists` order returned by SharePoint.
- Display and export negative Outstanding values as absolute values marked `(Extra)`.
- Verified source syntax for `app.js` and the Azure Function route. Mock-data verification confirmed that default result order follows the original `price_lists` order and retains a negative `waiting` value for `(Extra)` display formatting. The newest UI code still needs Azure deployment verification.

## Future architecture (optional)

If complex SQL/reporting or a 5-minute cache is needed later:

```text
SharePoint Lists -> Microsoft Graph delta sync -> Azure Functions timer -> Azure SQL
Website -> Azure Static Web Apps API -> Azure SQL
```

Use Microsoft Graph delta queries rather than repeatedly reading all List items.
