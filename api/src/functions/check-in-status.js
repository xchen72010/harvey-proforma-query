const { app } = require('@azure/functions');
const { getSourceData } = require('../shared/sharepoint');
const { calculateStatus } = require('../shared/proformas');

app.http('check-in-status', {
  methods: ['GET'], authLevel: 'anonymous', route: 'check-in-status',
  handler: async (request, context) => {
    try {
      const proformaNo = String(request.query.get('proformaNo') || '').trim();
      let data = calculateStatus(await getSourceData()).lines;
      if (proformaNo) data = data.filter((line) => line.invoice_no === proformaNo);
      data.sort((a, b) => a.invoice_no.localeCompare(b.invoice_no) || a.product_name.localeCompare(b.product_name));
      return { status: 200, jsonBody: { data } };
    } catch (error) {
      context.error(error);
      return { status: 500, jsonBody: { message: 'Unable to load status data.' } };
    }
  }
});
