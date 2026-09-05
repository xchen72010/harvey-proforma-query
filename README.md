# Pending Shipment Proformas — Azure Static Web Apps

The root folder contains the static website. `api/` is an Azure Functions Node.js v4 project. The API reads SharePoint Lists through Microsoft Graph; Entra credentials remain server-side.

## Change records and version policy

Record every change in this README and `HANDOFF_TO_CLAUDE.md`, including its scope and verification outcome. Keep new changes under **Unversioned** until the user explicitly requests a version number; then group all accumulated unversioned entries under that number. Do not automatically increment versions or create Git tags. These historical labels do not certify deployment to Azure.

### V1.1.1 — 2026-09-05

**Summary:** Stabilize row numbering and make Clear a local-only reset.

**Description:** V1.1.1 keeps each displayed and exported row number tied to its original `price_lists` position when users sort other columns. Clear now restores `All pending shipment proformas`, empties the table, resets all summary values and sorting, disables export, and returns the status to `Ready` without requesting all-proforma results from the API.

Changes assigned to this version:

#### 2026-09-04

- Fixed table and Excel-export `No.` values to remain attached to each row's original `price_lists` position when sorting other columns. The All view still has blank numbers.
- Documented the Clear behavior that existed at that point: it reset the selection to All and queried again. This was replaced on 2026-09-05 by the local-only reset below.
- Backfilled V1/V1.1 history at the user's requested boundary and established this ongoing recording policy. Corrected the handoff's stale deployment-status wording. This documentation update does not change application code or deploy it.

#### 2026-09-05

- Changed **Clear** to a local-only reset. It selects `All pending shipment proformas`, clears table rows, sets Product Lines / Checked In / Outstanding to `0`, removes the active sort state, disables Excel export and restores status to `Ready`.
- **Clear no longer calls the check-in-status API or loads all-proforma results.** The dropdown's already-loaded options remain available.
- Verification: `app.js` passed a JavaScript syntax check, and source checks confirmed that the Clear click handler calls only the local reset function. Azure deployment was not performed as part of this change.

The API package metadata is `1.1.1`. This version assignment does not create a Git tag or confirm an Azure deployment. Record the next change under a new **Unversioned** heading until the user assigns another version.

### V1.1 — after the original handoff through 2026-09-03

- Added ascending/descending table sorting and refined the direction arrows.
- Added `.xlsx` export of the current filtered and sorted results.
- Preserved the API's returned `price_lists` order as the default (not a guarantee of a custom SharePoint view's order).
- Updated dropdown labels to `invoice_name — invoice_no`, still searching only by `invoice_no`; removed the explanatory menu sentence.
- Displayed/exported negative Outstanding values as absolute values followed by `(Extra)` while retaining signed numeric sorting.
- Required README and handoff updates for every subsequent change.
- Verification recorded at the time: JavaScript syntax checks and mock API order/negative-value checks passed. Updated sorting/download behavior was not fully verified on Azure. A later read-only local Git audit found no workflow content difference from HEAD; it could not establish who had touched files.

### V1 — baseline through the original handoff

- English Pending Shipment Proforma Invoices page, Proforma Name dropdown, query results and selection-dependent numbering.
- Read-only SharePoint joins and totals; require matching `check_in_lookup` eligibility and `price_lists` lines, without filtering by positive Outstanding.
- Migrated the Vercel prototype to Azure Static Web Apps with Azure Functions v4, Graph access and server-side Entra settings.
- Initial handoff covering the Azure address, project structure, SharePoint/Entra setup, business rules, open issues and troubleshooting; no secrets included.

Historical grouping follows the user's original-handoff boundary, not newly invented release dates. Detailed context and verification limitations are in `HANDOFF_TO_CLAUDE.md`.

## Routes

- `GET /api/pending-shipment-proformas` — dropdown data: displays `invoice_name — invoice_no`, uses `invoice_no` as the value.
- `GET /api/check-in-status?proformaNo=<invoice_no>` — product status lines.

An invoice is included only when it exists in `check_in_lookup`; `waiting` is displayed but is not a filter.

## User interface behavior

- The **Proforma Name** dropdown displays `invoice_name — invoice_no`; searches use only `invoice_no`.
- Results retain the API's original `price_lists` order by default.
- Click any table header to sort ascending/descending. The active sort direction is highlighted by the header icon.
- **Export to Excel** downloads the current filtered and sorted results as an `.xlsx` file.
- The `No.` column follows the original `price_lists` order and starts at 1 only when a specific proforma has been selected; it remains blank for the All view. Sorting other columns never renumbers it.
- **Clear** resets the dropdown to All pending shipment proformas, clears the current rows and totals, removes sorting, disables export and restores `Ready`. It does not call the search API or change SharePoint data.
- Negative **Outstanding** values are displayed and exported as their absolute value followed by `(Extra)`; for example, `-5` becomes `5 (Extra)`.

## Deploy to Azure

1. Push this folder to a GitHub repository.
2. In the Azure portal, create **Azure Static Web Apps** and link the repository and branch.
3. In the GitHub Actions workflow generated by Azure, set:

   ```yaml
   app_location: "/"
   api_location: "api"
   output_location: ""
   ```

4. In the Static Web App, open **Configuration** and create application settings matching the values in `api/local.settings.json.example`. Do not add `AzureWebJobsStorage` or `FUNCTIONS_WORKER_RUNTIME` there.
5. In Microsoft Graph **Application permissions**, grant the Entra application `Sites.Read.All`, then select **Grant admin consent**. This lets the API read SharePoint Lists without the additional per-site PnP permission command.
6. Run the generated GitHub Actions workflow to deploy.

## Local development

Copy `api/local.settings.json.example` to `api/local.settings.json`, insert the Entra values, then run `npm install` and `npm start` in `api/` with Azure Functions Core Tools installed.

`Sites.Read.All` can read Lists across the tenant. Keep the client secret only in Azure application settings; never commit `api/local.settings.json` or an Entra client secret.

## Release checklist

After changing source files, commit and push to the GitHub branch connected to Azure Static Web Apps. Wait for GitHub Actions deployment to finish, then verify that the deployed page contains the current sorting icons and the **Export to Excel** button before treating the release as complete.
