const select = document.querySelector('#proforma-name');
const body = document.querySelector('#result-body');
const status = document.querySelector('#status');
const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const exportButton = document.querySelector('#export-button');
let currentRows = [];
let sortKey = null;
let sortDirection = 'ascending';

function formatOutstanding(value) {
  const amount = Number(value || 0);
  return amount < 0 ? `${numberFormat.format(Math.abs(amount))} (Extra)` : numberFormat.format(amount);
}

function updateSummary(rows) {
  document.querySelector('#row-count').textContent = rows.length;
  document.querySelector('#received-total').textContent = numberFormat.format(rows.reduce((sum, r) => sum + Number(r.total || 0), 0));
  document.querySelector('#waiting-total').textContent = formatOutstanding(rows.reduce((sum, r) => sum + Number(r.waiting || 0), 0));
}

function displayedRows() {
  const rows = currentRows.map((row, index) => ({ ...row, _originalIndex: index }));
  if (!sortKey) return rows;
  const multiplier = sortDirection === 'ascending' ? 1 : -1;
  return rows.sort((a, b) => {
    if (sortKey === 'index') return multiplier * (a._originalIndex - b._originalIndex);
    if (sortKey === 'total' || sortKey === 'waiting') return multiplier * (Number(a[sortKey]) - Number(b[sortKey]));
    return multiplier * String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), undefined, { numeric: true });
  });
}

function updateSortIndicators() {
  document.querySelectorAll('.sort-button').forEach((button) => {
    const active = button.dataset.sortKey === sortKey;
    button.parentElement.setAttribute('aria-sort', active ? sortDirection : 'none');
    button.dataset.direction = active ? sortDirection : 'none';
  });
}

function render() {
  const rows = displayedRows();
  body.replaceChildren();
  if (!rows.length) body.append(document.querySelector('#empty-row').content.cloneNode(true));
  const shouldNumber = select.value !== '';
  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    [shouldNumber ? row._originalIndex + 1 : '', row.product_name, row.invoice_no, numberFormat.format(row.total), formatOutstanding(row.waiting)].forEach((value, i) => {
      const td = document.createElement('td');
      td.textContent = value ?? '';
      if (i === 0) td.className = 'index';
      if (i > 2) td.className = 'number';
      tr.append(td);
    });
    body.append(tr);
  });
  updateSummary(rows);
  updateSortIndicators();
  exportButton.disabled = rows.length === 0;
}

function clearResults() {
  select.value = '';
  currentRows = [];
  sortKey = null;
  sortDirection = 'ascending';
  body.replaceChildren(document.querySelector('#initial-row').content.cloneNode(true));
  updateSummary([]);
  updateSortIndicators();
  exportButton.disabled = true;
  status.textContent = 'Ready';
}

async function loadProformas() {
  try {
    const response = await fetch('/api/pending-shipment-proformas');
    if (!response.ok) throw new Error('Request failed');
    const { data } = await response.json();
    data.forEach(({ invoice_no, invoice_name }) => {
      const label = invoice_name ? `${invoice_name} — ${invoice_no}` : invoice_no;
      select.add(new Option(label, invoice_no));
    });
  } catch {
    status.textContent = 'Waiting for the API to load proforma names.';
  }
}

async function search() {
  status.textContent = 'Searching…';
  try {
    const response = await fetch(`/api/check-in-status?proformaNo=${encodeURIComponent(select.value)}`);
    if (!response.ok) throw new Error('Request failed');
    const { data } = await response.json();
    currentRows = data;
    sortKey = null;
    render();
    status.textContent = `${data.length} record(s) shown`;
  } catch {
    currentRows = [];
    sortKey = null;
    render();
    status.textContent = 'Unable to load data. Start the API server first.';
  }
}

function exportExcel() {
  const rows = displayedRows();
  if (!rows.length || !window.XLSX) {
    status.textContent = 'Excel export is unavailable. Please try again.';
    return;
  }
  const shouldNumber = select.value !== '';
  const values = [
    ['No.', 'Product Name', 'Proforma No.', 'Checked In', 'Outstanding'],
    ...rows.map((row) => [shouldNumber ? row._originalIndex + 1 : '', row.product_name, row.invoice_no, Number(row.total || 0), formatOutstanding(row.waiting)])
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(values);
  worksheet['!cols'] = [{ wch: 8 }, { wch: 34 }, { wch: 24 }, { wch: 14 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proforma Status');
  const fileDate = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `pending-shipment-proformas-${fileDate}.xlsx`);
  status.textContent = 'Excel file downloaded.';
}

document.querySelector('#search-form').addEventListener('submit', (event) => { event.preventDefault(); search(); });
document.querySelector('#clear-button').addEventListener('click', clearResults);
document.querySelectorAll('.sort-button').forEach((button) => button.addEventListener('click', () => {
  const nextKey = button.dataset.sortKey;
  sortDirection = sortKey === nextKey && sortDirection === 'ascending' ? 'descending' : 'ascending';
  sortKey = nextKey;
  render();
}));
exportButton.addEventListener('click', exportExcel);
loadProformas();
