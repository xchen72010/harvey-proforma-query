const graphBase = 'https://graph.microsoft.com/v1.0';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required application setting: ${name}`);
  return value;
}

async function graphToken() {
  const body = new URLSearchParams({
    client_id: required('AZURE_CLIENT_ID'),
    client_secret: required('AZURE_CLIENT_SECRET'),
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });
  const response = await fetch(`https://login.microsoftonline.com/${required('AZURE_TENANT_ID')}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
  });
  if (!response.ok) throw new Error(`Could not get Microsoft Graph token: ${response.status}`);
  return (await response.json()).access_token;
}

async function graphGet(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Microsoft Graph request failed: ${response.status}`);
  return response.json();
}

async function getSiteId(token) {
  const host = process.env.SHAREPOINT_HOSTNAME || 'harveypharma.sharepoint.com';
  const path = process.env.SHAREPOINT_SITE_PATH || '/sites/HarveyPharma';
  const site = await graphGet(`${graphBase}/sites/${host}:${path}`, token);
  return site.id;
}

async function getListFields(siteId, listName, select, token) {
  let url = `${graphBase}/sites/${siteId}/lists/${encodeURIComponent(listName)}/items?` + new URLSearchParams({ '$expand': `fields($select=${select.join(',')})`, '$top': '999' });
  const rows = [];
  while (url) {
    const page = await graphGet(url, token);
    rows.push(...page.value.map((item) => item.fields));
    url = page['@odata.nextLink'];
  }
  return rows;
}

async function getSourceData() {
  const token = await graphToken();
  const siteId = await getSiteId(token);
  const [lookup, priceLists, checkInItems] = await Promise.all([
    getListFields(siteId, required('CHECK_IN_LOOKUP_LIST'), ['invoice_no', 'invoice_name'], token),
    getListFields(siteId, required('PRICE_LISTS_LIST'), ['invoice_no', 'product_name', 'quantity'], token),
    getListFields(siteId, required('CHECK_IN_ITEMS_LIST'), ['proforma_no', 'product_name', 'quantity'], token)
  ]);
  return { lookup, priceLists, checkInItems };
}

module.exports = { getSourceData };
