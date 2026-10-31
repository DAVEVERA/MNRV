const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const handlerPath = path.join(__dirname, '..', 'api', 'send-contact-mail.js');

function loadHandler() {
  delete require.cache[require.resolve(handlerPath)];
  delete require.cache[require.resolve(path.join(__dirname, '..', 'api', '_mail.js'))];
  return require(handlerPath);
}

function mockRes() {
  const res = { statusCode: 0, headers: {}, body: '' };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.end = (b) => { res.body = b; };
  res.json = () => JSON.parse(res.body);
  return res;
}

function withFetch(impl, fn) {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); return impl(url, opts); };
  return Promise.resolve(fn(calls)).finally(() => { global.fetch = original; });
}

const okFetch = async () => ({ ok: true, json: async () => ({ id: 'email_1' }) });
const valid = { name: 'Sanne de Vries', email: 'sanne@example.nl', company: 'Bakkerij <b>Zoet</b>', message: 'We willen een AI-chatbot op onze site.', interests: ['agents', 'website'], source: 'contact' };

test.beforeEach(() => { process.env.RESEND_API_KEY = 'test-key'; });

test('rejects non-POST requests', async () => {
  const res = mockRes();
  await loadHandler()({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
});

test('reports missing mail configuration', async () => {
  delete process.env.RESEND_API_KEY;
  const res = mockRes();
  await loadHandler()({ method: 'POST', body: valid }, res);
  assert.equal(res.statusCode, 500);
});

test('rejects invalid input with the failing fields', async () => {
  await withFetch(okFetch, async (calls) => {
    const res = mockRes();
    await loadHandler()({ method: 'POST', body: { name: 'A', email: 'geen-mail', message: 'kort' } }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.json().fields.sort(), ['email', 'message', 'name']);
    assert.equal(calls.length, 0);
  });
});

test('silently drops submissions that fill the honeypot', async () => {
  await withFetch(okFetch, async (calls) => {
    const res = mockRes();
    await loadHandler()({ method: 'POST', body: { ...valid, website: 'http://spam.example' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 0);
  });
});

test('sends one escaped mail to MNRV with reply-to the sender', async () => {
  await withFetch(okFetch, async (calls) => {
    const res = mockRes();
    await loadHandler()({ method: 'POST', body: JSON.stringify(valid) }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    const mail = calls[0].body;
    assert.deepEqual(mail.to, ['info@mnrv.nl']);
    assert.deepEqual(mail.reply_to, ['sanne@example.nl']);
    assert.match(mail.html, /Bakkerij &lt;b&gt;Zoet&lt;\/b&gt;/);
    assert.doesNotMatch(mail.html, /<b>Zoet<\/b>/);
    assert.match(mail.html, /AI Agents/);
  });
});

test('strips line breaks from the subject', async () => {
  await withFetch(okFetch, async (calls) => {
    const res = mockRes();
    await loadHandler()({ method: 'POST', body: { ...valid, name: 'Sanne\r\nBcc: x@evil.test' } }, res);
    assert.equal(res.statusCode, 200);
    assert.doesNotMatch(calls[0].body.subject, /[\r\n]/);
  });
});

test('ignores unknown interest values', async () => {
  await withFetch(okFetch, async (calls) => {
    const res = mockRes();
    await loadHandler()({ method: 'POST', body: { ...valid, interests: ['agents', '<script>'] } }, res);
    assert.equal(res.statusCode, 200);
    assert.doesNotMatch(calls[0].body.html, /script/);
  });
});

test('returns 502 when the mail provider fails', async () => {
  await withFetch(async () => ({ ok: false, json: async () => ({ message: 'quota' }) }), async () => {
    const res = mockRes();
    await loadHandler()({ method: 'POST', body: valid }, res);
    assert.equal(res.statusCode, 502);
  });
});
