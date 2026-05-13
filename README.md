# UN Logo API

A Next.js application that serves as both an interactive logo selector UI and a REST API for UN system entity logos.

**Repository:** https://github.com/united-nations/logos

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the logo selector UI.  
The API is available at [http://localhost:3000/api/logos](http://localhost:3000/api/logos).

---

## API Reference

### List all logos

```
GET /api/logos
```

Returns all UN entities that have at least one logo available.

**Query parameters:**

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `mode` | `light` \| `dark` \| `all` | `all` | Filter by color mode |
| `format` | `svg` \| `png` \| `jpg` \| `pdf` | — | Filter by file format |

**Example requests:**

```bash
# All available logos
GET /api/logos

# SVG logos in light mode only
GET /api/logos?mode=light&format=svg
```

**Example response:**

```json
{
  "count": 1,
  "entities": [
    {
      "entity": "UN",
      "entity_long": "United Nations",
      "un_principal_organ": null,
      "system_grouping": null,
      "logos": {
        "light": [
          { "format": "svg", "url": "/images/light/un.svg" },
          { "format": "png", "url": "/images/light/un.png" }
        ],
        "dark": [
          { "format": "svg", "url": "/images/dark/un.svg" },
          { "format": "png", "url": "/images/dark/un.png" }
        ]
      }
    }
  ]
}
```

---

### Get a specific entity's logos

```
GET /api/logos/{entity}
```

Returns logo URLs and metadata for one entity. Entity codes are case-insensitive.

**Example requests:**

```bash
GET /api/logos/UN
GET /api/logos/unicef?mode=dark&format=svg
```

**Example response:**

```json
{
  "entity": "UN",
  "entity_long": "United Nations",
  "entity_description": "...",
  "un_principal_organ": null,
  "system_grouping": null,
  "category": null,
  "logos": {
    "light": [
      { "format": "svg", "url": "/images/light/un.svg" },
      { "format": "png", "url": "/images/light/un.png" }
    ],
    "dark": [
      { "format": "svg", "url": "/images/dark/un.svg" },
      { "format": "png", "url": "/images/dark/un.png" }
    ]
  }
}
```

Returns `404` if the entity code is not found or no logos match the filters.

---

## Logo File Structure

Static logo files are served directly from `/public/images/`:

```
public/images/
  light/
    {entity}.svg
    {entity}.png
  dark/
    {entity}.svg
    {entity}.png
```

Files are accessible as static assets at the same URL paths (e.g. `/images/light/un.svg`).  
Entity codes in filenames are lowercased (e.g. `UNICEF` → `unicef.svg`).

---

## Adding Logos

1. Place logo files in `public/images/light/` and/or `public/images/dark/`
2. Name them `{entity_code_lowercase}.{format}` (e.g. `unicef.svg`)
3. Ensure the entity exists in `public/data/un-entities.csv`

The API automatically reflects any new files — no code changes required.

---

## Deployment

### Server mode (default) — API enabled

Deploy to [Vercel](https://vercel.com), a Node.js server, or any platform that supports Next.js server-side rendering.

```bash
npm run build
npm start
```

Set `BASE_PATH` to your subdirectory if serving under a path prefix:

```bash
BASE_PATH=/logos npm run build
```

### Static export — UI only, no API

For GitHub Pages or other static hosts. API routes are not available in this mode.

```bash
STATIC_EXPORT=true BASE_PATH=/logos npm run build
# Output is in the `out/` directory
```
