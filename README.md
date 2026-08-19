# leads-crm

CRM ligero para gestión de leads: pipeline (kanban), bandeja de WhatsApp y contactos.
Pensado para conectarse con Meta Ads (leads de anuncios) y WhatsApp a través de n8n.

## Stack

- React + Vite
- Supabase (base de datos, auth, realtime)
- n8n (automatizaciones / integraciones externas)

## Desarrollo local

```bash
npm install
cp .env.example .env   # completa tus credenciales de Supabase
npm run dev
```

## Modelo de datos (Supabase)

- `contacts` — personas (nombre, teléfono, correo, origen, tags)
- `pipelines` / `stages` — el pipeline de ventas (kanban)
- `deals` — un lead avanzando por el pipeline, ligado a un contacto
- `messages` — hilo de conversación de WhatsApp por contacto (`direction`: `in`/`out`)
- `activities` — notas/actividad sobre un deal o contacto
- `webhook_events` — log crudo de webhooks entrantes (Meta Ads, WhatsApp) para depuración

## Integraciones (vía n8n)

- **Meta Lead Ads → CRM**: n8n escucha el webhook de leads de Meta y crea/actualiza el `contact` y el `deal` (etapa "Nuevo Lead") en Supabase.
- **WhatsApp → CRM**: n8n escucha el webhook de WhatsApp Cloud API, crea el `contact` si no existe e inserta el `message` (`direction = 'in'`).
- **CRM → WhatsApp**: al enviar un mensaje desde la Bandeja, se inserta un `message` con `direction = 'out'` y `status = 'pending'`. Un workflow de n8n debe escuchar esos inserts (Realtime o polling), enviarlos por WhatsApp Cloud API y actualizar `status` a `'sent'`.
