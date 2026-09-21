# Landing page editable de Lisbeth (Protección Familiar)

## Qué es esto
Dos páginas HTML que funcionan juntas:

- `index.html` — la página PÚBLICA. Es la que va en Google Ads como
  "URL final". Cualquiera la puede abrir, sin cuenta de nada.
- `editor.html` — el panel PRIVADO donde Lisbeth actualiza su foto,
  título, testimonio y número de WhatsApp. Pedir contraseña:
  **protegida2026** (Jairo puede cambiarla editando la constante
  `PASSWORD` dentro de `editor.html`).

Ambas leen y escriben en la misma base de datos (un proyecto de
Supabase ya creado: `leads-crm`, el mismo que usa el resto del
proyecto de Liz), así que cuando Lisbeth guarda un cambio en
`editor.html`, se refleja automáticamente en `index.html` — no hace
falta volver a publicar nada.

## Paso 1 — Subir los dos archivos
Subir `index.html` y `editor.html` juntos, en la MISMA carpeta, al
repo de GitHub Pages (por ejemplo dentro de una carpeta nueva
`/proteccion-familiar-lisbeth/` en el repo que ya usas, o un repo
nuevo). No se pueden separar en carpetas distintas porque
`editor.html` calcula el link a la página pública asumiendo que
viven juntas.

## Paso 2 — Activar GitHub Pages
Igual que siempre: Settings > Pages, activar sobre la rama `main`.

## Paso 3 — Las dos URLs resultantes
Si el repo queda en `jairott.github.io/proteccion-familiar-lisbeth/`:

- Pública (para Google Ads): `.../proteccion-familiar-lisbeth/index.html`
- Editor (solo para Lisbeth, con contraseña):
  `.../proteccion-familiar-lisbeth/editor.html`

Dale a Lali/Google Ads solo el link de `index.html`.
Dale a Lisbeth solo el link de `editor.html` (y la contraseña).

## Detalles técnicos (por si hace falta tocar algo)
- Backend: Supabase, proyecto `leads-crm`
  (`glxmakgcvzympuioqvlp.supabase.co`), tabla `lisbeth_landing_content`
  (una sola fila, id `lisbeth-proteccion-familiar`) y bucket de
  Storage público `lisbeth-photos` para las fotos que ella suba.
- Las dos páginas usan la misma `anon key` de Supabase, ya incrustada
  en el HTML — es una clave pública de solo-cliente, normal para este
  tipo de uso.
- El botón de WhatsApp en `index.html` se arma dinámicamente con el
  número guardado en la base de datos (por defecto 786-702-9038 si
  Lisbeth no lo ha cambiado).
