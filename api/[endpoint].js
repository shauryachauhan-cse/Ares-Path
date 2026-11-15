import worker from '../dist/server/index.js';

export default async function handler(req, res) {
  try {
    const endpoint = Array.isArray(req.query.endpoint)
      ? req.query.endpoint[0] : req.query.endpoint;
    const allowed = new Set(['health', 'routes', 'estimate', 'energy', 'intelligence', 'missions']);
    if (!allowed.has(endpoint)) {
      return res.status(404).json({error: 'Endpoint not found'});
    }
    const scheme = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `${scheme}://${host}`);
    url.pathname = `/api/${endpoint}`;
    url.searchParams.delete('endpoint');
    const method = req.method || 'GET';
    let body;
    if (method !== 'GET' && method !== 'HEAD') {
      const supplied = req.body;
      if (supplied !== undefined && supplied !== null) {
        body = typeof supplied === 'string' || Buffer.isBuffer(supplied)
          ? supplied : JSON.stringify(supplied);
      } else {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        body = Buffer.concat(chunks);
      }
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
    // ChatGPT Sites' authenticated user header is NOT trusted outside that platform.
    headers.delete('oai-authenticated-user-id');
    const response = await worker.fetch(new Request(url, {method, headers, body}), {});
    res.status(response.status);
    for (const [name, value] of response.headers) res.setHeader(name, value);
    return res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Ares Path API error:', error);
    return res.status(500).json({error: 'Unable to complete request'});
  }
}
