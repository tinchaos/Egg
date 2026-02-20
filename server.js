const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const PLAN_PATH = path.join(__dirname, 'data', 'plan.txt');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

async function readPlan() {
  try {
    return await fs.readFile(PLAN_PATH, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return 'No hay plan cargado todavía.';
    throw error;
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error('Payload demasiado grande');
  }
  return body ? JSON.parse(body) : {};
}

async function serveStatic(req, res, pathname) {
  const target = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.normalize(target).replace(/^([.]{2}[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = reqUrl;

  try {
    if (req.method === 'GET' && pathname === '/api/plan') {
      const plan = await readPlan();
      return sendJson(res, 200, { plan });
    }

    if (req.method === 'POST' && pathname === '/api/plan') {
      if (ADMIN_TOKEN && req.headers['x-admin-token'] !== ADMIN_TOKEN) {
        return sendJson(res, 401, { error: 'Token de administración inválido.' });
      }

      const body = await parseBody(req);
      if (typeof body.plan !== 'string' || !body.plan.trim()) {
        return sendJson(res, 400, { error: 'El texto del plan es obligatorio.' });
      }

      await fs.writeFile(PLAN_PATH, body.plan.trim(), 'utf8');
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/chat') {
      if (!OPENAI_API_KEY) {
        return sendJson(res, 500, { error: 'Falta configurar OPENAI_API_KEY.' });
      }

      const body = await parseBody(req);
      if (typeof body.message !== 'string' || !body.message.trim()) {
        return sendJson(res, 400, { error: 'Mensaje inválido.' });
      }

      const plan = await readPlan();
      const systemPrompt = `Actúa como el Asistente de IA de alto nivel de Martín Urtasun, Arquitecto y candidato a Product Owner para la Célula BIT (CoE de IA) del Banco Ciudad.
Objetivo: presentar y defender su Plan de Trabajo ante líderes de tecnología y negocio.
Tono: conversacional, claro, profesional, cercano.
Idioma: español rioplatense.
Reglas:
- Responde usando EXCLUSIVAMENTE la información del plan cargado y el contexto del rol.
- Si falta información, dilo explícitamente y sugiere cómo completarla.
- Ofrece ayuda proactiva con opciones concretas.
- Cuando aplique, menciona impacto en negocio, cliente y tecnología.
Nombre del visitante: ${body.userName || 'visitante'}
Plan vigente:\n${plan}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.4,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: body.message }
          ]
        })
      });

      if (!response.ok) {
        return sendJson(res, 500, { error: `Error de OpenAI: ${await response.text()}` });
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';
      return sendJson(res, 200, { reply });
    }

    return serveStatic(req, res, pathname);
  } catch (error) {
    return sendJson(res, 500, { error: `Error interno: ${error.message}` });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor disponible en http://localhost:${PORT}`);
});
