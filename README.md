# AguaVista

Sitio del condominio privado AguaVista. Next.js 16 (App Router) + React 19 +
Tailwind v4 + Framer Motion + Lenis, en español, inglés y portugués.

## Arranque

```bash
npm install
cp .env.example .env.local   # y completar las variables
npm run dev                  # http://localhost:3000 → redirige a /es
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (prerenderiza los 3 idiomas) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run optimize:media` | Recomprime `/public` desde los originales y recorta los micro-loops |
| `npm run optimize:media:full` | Igual, pero sin recortar (metraje completo) |
| `npm run generate:icons` | Regenera favicons + OG image desde el monograma |
| `npm run probe:loop` | Busca en qué segundo conviene cortar un video para que el loop cierre |

## Variables de entorno

Ver `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` es **solo de servidor**: la usa
la server action del formulario para escribir en `leads` sin exponer la tabla
al navegador. Nunca la prefijes con `NEXT_PUBLIC_`.

Sin credenciales de Supabase el sitio sigue funcionando: el masterplan muestra
el mapa base sin lotes y el formulario devuelve un error controlado.

`ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` protegen el panel `/admin`. Si
falta cualquiera de las dos, el panel no deja entrar a nadie y avisa por
consola. El secreto se genera con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Sistema de diseño

Todos los colores salen de tokens CSS definidos en `src/app/globals.css`
(paleta **Bosque AguaVista**), con variante clara y oscura:

| Token | Dark | Light | Uso |
| --- | --- | --- | --- |
| `--av-base` | `#0A1A14` | `#F7F4EC` | Fondo de página |
| `--av-surface` | `#10251D` | `#FFFFFF` | Cards, secciones alternas |
| `--av-elevated` | `#163027` | `#FDFBF5` | Hover, modales |
| `--av-border` | `#204034` | `#E0DACA` | Bordes |
| `--av-text` | `#F0F4EF` | `#0A1A14` | Texto principal |
| `--av-text-muted` | `#93A89A` | `#5A6B5F` | Texto secundario |
| `--av-vivo` | `#A3D45B` | `#4F7F16` | CTAs, subrayados, acento |
| `--av-lux` | `#C9A962` | `#9C7B33` | Detalles finos, serif |

En Tailwind se usan como `bg-base`, `text-ink`, `text-vivo`, `border-line`…
(el puente está en el bloque `@theme inline` de `globals.css`).

**No hardcodees hex en componentes nuevos.** Si necesitás un valor puntual,
usá `bg-[color:var(--av-surface)]`.

Utilidades de profundidad: `.av-glow` (luz radial de fondo), `.av-noise`
(grano contra el banding), `.av-glass` (vidrio esmerilado), `.av-hairline`
(filete separador), `.av-skeleton` (shimmer de carga).

## Estructura

```
src/
  app/[locale]/          layout, home, privacidad, admin
  app/actions/           server actions (formulario de contacto)
  components/layout/     navbar, drawer, footer, preloader, tema, idioma
  components/sections/   hero, amenities, lotes, testimonios, contacto, faq
  components/motion/     Reveal, StaggerGroup, SplitText
  components/forms/      campos e integración con react-hook-form + zod
  config/                site.ts (marca y contacto), navigation.ts
  data/                  amenities.ts, testimonials.ts
  i18n/                  routing, request, navigation
messages/                es.json, en.json, pt.json
scripts/                 optimize-media.mjs, generate-icons.mjs
```

## Internacionalización

`next-intl` con prefijo de idioma siempre visible (`/es`, `/en`, `/pt`).
Para agregar texto: sumá la clave a los **tres** archivos de `messages/` y
consumila con `useTranslations` (cliente) o `getTranslations` (servidor).

Para enlaces internos importá `Link` desde `@/i18n/navigation`, nunca desde
`next/link`, o la navegación pierde el idioma.

## Panel /admin

`/es/admin` (o `/en`, `/pt`) es el Centro de Mando del masterplan.

La sesión es una cookie **httpOnly** firmada con HMAC-SHA256, emitida por
una server action tras comparar la contraseña contra `ADMIN_PASSWORD` en
tiempo constante. Dura 8 horas y se corta a los 5 intentos fallidos por IP
durante 15 minutos.

Lo importante del diseño: `page.tsx` es un **server component** que valida
la cookie antes de renderizar. Si la sesión no es válida, el árbol del
panel no se serializa — no es un `display:none`, el HTML del panel
directamente no existe en la respuesta. Ni la contraseña ni la lógica de
comparación viajan nunca al navegador.

## Media

Los originales sin comprimir viven fuera del repo desplegado, en
`../media-originales/`. `optimize-media.mjs` siempre re-encodea **desde
ahí**, así que se puede volver a correr con otros parámetros sin degradar
la calidad de forma acumulativa.

### Micro-loops

Los videos de fondo se recortan a ventanas de 8–14 s. Las ventanas están
definidas en `VIDEO_PROFILES` dentro de `scripts/optimize-media.mjs`:

```js
"banner.mp4": { start: 6, duration: 14.7, seamless: true, maxDim: 1280, crf: 30, fps: 25 }
```

Con `seamless: true` el script cruza la cola del clip con su cabeza
(crossfade de 0,7 s), de modo que el último frame coincide con el primero
y el loop no muestra ningún salto. Siete de los ocho videos cierran así.

`aeropuertoreel.mp4` es la excepción: es un montaje de cortes rápidos
(160 cortes en 99 s) y no existe ninguna ventana de 10 s sin cortes, así
que un crossfade se vería como un disolvido fuera de lugar. Ese clip usa
`seamless: false` y se recorta **exactamente entre dos cortes de plano**
(60,6 s → 71,4 s): el punto de loop cae sobre un corte y se lee como uno
más del montaje.

Para reajustar una ventana, `npm run probe:loop -- <archivo> <duración>
<crossfade> <start...>` prueba varios puntos de entrada y reporta cuál
cierra mejor.

### Reproducción

Ningún `<video>` se toca directamente: todos pasan por
`components/ui/LoopVideo.tsx`, que con un IntersectionObserver

- no descarga un solo byte hasta que el video entra en viewport
  (`preload="none"` y el `<source>` se inyecta recién ahí),
- pausa cuando el video sale de pantalla o cuando la pestaña deja de
  estar visible,
- respeta `prefers-reduced-motion`.

Sin esto, cuatro reels decodificando a la vez en segundo plano se comen
los 60 fps del scroll.

## Interruptores de sección

`src/config/features.ts` decide qué se renderiza. Se prefieren flags a
comentar bloques de JSX: el código sigue compilando y tipando, así que no
se pudre mientras está apagado.

| Flag | Estado | Qué controla |
| --- | --- | --- |
| `SHOW_SALES_SECTION` | `false` | Masterplan interactivo. Con el flag apagado se muestra `<ComingSoon />` en su lugar y el chunk del mapa ni se genera. |
| `TESTIMONIALS_PUBLISHED` | `false` | Carrusel de testimonios. Apagado mientras `src/data/testimonials.ts` tenga relleno. |

Los enlaces del navbar se derivan de estos flags
(`src/config/navigation.ts`), así que apagar una sección no deja un ancla
apuntando a la nada.

## Pendientes conocidos

- **Datos de contacto y RRSS** (`src/config/site.ts`): teléfono, WhatsApp,
  email, dirección, coordenadas y URLs de perfiles siguen siendo
  provisorios. Están marcados con `PENDIENTE` y hay un checklist en la
  cabecera del archivo. Cambiándolos ahí se propagan solos al footer, al
  contacto, al botón de WhatsApp y al JSON-LD.
- **Testimonios** (`src/data/testimonials.ts`): la estructura está lista y
  tipada, con texto de relleno y nombres vacíos a propósito. Completar y
  poner `TESTIMONIALS_PUBLISHED = true`.
- **Textos legales**: `/privacidad` y `/terminos` tienen redacción estándar
  para condominio, pendiente de revisión por un abogado. La UI ya está
  terminada y enlazada desde el footer.
- El panel `/admin` conserva la paleta visual original (fondos `#1C1917`).
  Es una herramienta interna y no entró en el rediseño; su seguridad y su
  tipado sí se resolvieron.
