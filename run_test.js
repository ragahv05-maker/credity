const originalFetch = global.fetch;
async function run() {
  try {
    const res = await originalFetch('http://127.0.0.1:5001/api/v1/credentials/issue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateId: 'template-1', issuerId: 'issuer-1', recipient: {}, credentialData: {} }),
    });
    console.log(res.status);
  } catch (e) {
    console.error(e);
  }
}
run();
