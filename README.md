# BIT PO Chat Demo

App web estilo WhatsApp para presentar el plan de trabajo de Martín Urtasun para el rol de Product Owner de la Célula BIT.

## Requisitos

- Node.js 18+
- `OPENAI_API_KEY`

## Uso

```bash
npm install
OPENAI_API_KEY=tu_api_key npm start
```

Abrir `http://localhost:3000`.

## Variables opcionales

- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `ADMIN_TOKEN` para proteger el guardado del plan

## Actualización del plan

- Desde la UI, panel derecho > "Actualizar plan".
- Se puede pegar texto o cargar archivo `.txt/.md`.
- El contenido se guarda en `data/plan.txt` y se usa al instante.
