const { app } = require('@azure/functions');
const { getSourceData } = require('../shared/sharepoint');
const { calculateStatus } = require('../shared/proformas');

app.http('pending-shipment-proformas', {
  methods: ['GET'], authLevel: 'anonymous', route: 'pending-shipment-proformas',
  handler: async (_request, context) => {
    try {
      const { namesByInvoice, pendingInvoices } = calculateStatus(await getSourceData());
      const data = [...pendingInvoices].map((invoice_no) => ({ invoice_no, invoice_name: namesByInvoice.get(invoice_no) || invoice_no })).sort((a, b) => a.invoice_name.localeCompare(b.invoice_name));
      return { status: 200, jsonBody: { data } };
    } catch (error) {
      context.error(error);
      return { status: 500, jsonBody: { message: 'Unable to load proforma names.' } };
    }
  }
});
