const select = document.querySelector('#proforma-name');
const body = document.querySelector('#result-body');
const status = document.querySelector('#status');
const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function updateSummary(rows) {
  document.querySelector('#row-count').textContent = rows.length;
  document.querySelector('#received-total').textContent = numberFormat.format(rows.reduce((sum, r) => sum + Number(r.total || 0), 0));
  document.querySelector('#waiting-total').textContent = numberFormat.format(rows.reduce((sum, r) => sum + Number(r.waiting || 0), 0));
}

function render(rows) {
  body.replaceChildren();
  if (!rows.length) body.append(document.querySelector('#empty-row').content.cloneNode(true));
  const shouldNumber = select.value !== '';
  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    [shouldNumber ? index + 1 : '', row.product_name, row.invoice_no, numberFormat.format(row.total), numberFormat.format(row.waiting)].forEach((value, i) => {
      const td = document.createElement('td');
      td.textContent = value ?? '';
      if (i === 0) td.className = 'index';
      if (i > 2) td.className = 'number';
      tr.append(td);
    });
    body.append(tr);
  });
  updateSummary(rows);
}

async function loadProformas() {
  try {
    const response = await fetch('/api/pending-shipment-proformas');
    if (!response.ok) throw new Error('Request failed');
    const { data } = await response.json();
    data.forEach(({ invoice_no, invoice_name }) => select.add(new Option(invoice_name, invoice_no)));
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
    render(data);
    status.textContent = `${data.length} record(s) shown`;
  } catch {
    render([]);
    status.textContent = 'Unable to load data. Start the API server first.';
  }
}

document.querySelector('#search-form').addEventListener('submit', (event) => { event.preventDefault(); search(); });
document.querySelector('#clear-button').addEventListener('click', () => { select.value = ''; search(); });
loadProformas();
