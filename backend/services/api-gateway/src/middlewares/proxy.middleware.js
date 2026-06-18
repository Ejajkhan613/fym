const createError = require("http-errors");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function buildForwardHeaders(req) {
  const headers = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && value !== undefined) {
      headers[key] = Array.isArray(value) ? value.join(", ") : value;
    }
  }

  headers["x-forwarded-host"] = req.get("host") || "";
  headers["x-forwarded-method"] = req.method;
  headers["x-forwarded-proto"] = req.protocol;

  return headers;
}

async function readRequestBody(req) {
  const chunks = [];
  let totalBytes = 0;
  const maxBytes = Number(process.env.GATEWAY_PROXY_MAX_BODY_BYTES || 25 * 1024 * 1024);

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > maxBytes) {
      throw createError(413, "Request body is too large");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

async function buildRequestBody(req) {
  if (["GET", "HEAD"].includes(req.method)) return undefined;

  if (req.body === undefined || req.body === null) return undefined;

  if (Buffer.isBuffer(req.body) || typeof req.body === "string") {
    return req.body;
  }

  return JSON.stringify(req.body);
}

function copyResponseHeaders(upstreamResponse, res) {
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });
}

function createProxyMiddleware(targetUrl) {
  return async (req, res, next) => {
    try {
      const upstreamUrl = new URL(req.originalUrl, targetUrl);
      let body = await buildRequestBody(req);
      const headers = buildForwardHeaders(req);

      if (body === undefined && !["GET", "HEAD"].includes(req.method)) {
        const rawBody = await readRequestBody(req);
        body = rawBody.length > 0 ? rawBody : undefined;
      }

      if (body !== undefined && !headers["content-type"]) {
        headers["content-type"] = "application/json";
      }

      const upstreamResponse = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        body,
        redirect: "manual",
      });

      copyResponseHeaders(upstreamResponse, res);

      const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
      res.status(upstreamResponse.status);

      if (responseBody.length === 0) {
        return res.send();
      }

      return res.send(responseBody);
    } catch (error) {
      if (error.cause?.code === "ECONNREFUSED") {
        return next(createError(502, "Upstream service is unavailable"));
      }

      return next(error);
    }
  };
}

module.exports = {
  createProxyMiddleware,
};
