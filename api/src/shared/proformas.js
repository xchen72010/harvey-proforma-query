const text = (value) => String(value ?? '').trim();
const number = (value) => Number(value ?? 0) || 0;

function calculateStatus({ lookup, priceLists, checkInItems }) {
  const namesByInvoice = new Map();
  lookup.forEach((row) => {
    const invoiceNo = text(row.invoice_no);
    if (invoiceNo) namesByInvoice.set(invoiceNo, text(row.invoice_name));
  });
  const checkedInByLine = new Map();
  checkInItems.forEach((row) => {
    const key = `${text(row.proforma_no)}\u0000${text(row.product_name)}`;
    checkedInByLine.set(key, (checkedInByLine.get(key) || 0) + number(row.quantity));
  });
  // Membership in check_in_lookup is the pending-shipment source of truth.
  const lines = priceLists.filter((row) => namesByInvoice.has(text(row.invoice_no))).map((row) => {
    const invoice_no = text(row.invoice_no);
    const product_name = text(row.product_name);
    const total = checkedInByLine.get(`${invoice_no}\u0000${product_name}`) || 0;
    return { product_name, invoice_no, total, waiting: number(row.quantity) - total };
  });
  return { lines, namesByInvoice, pendingInvoices: new Set(lines.map((line) => line.invoice_no)) };
}

module.exports = { calculateStatus };
