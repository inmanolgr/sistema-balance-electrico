# Balance Eléctrico Nacional — REE
 
Sistema fullstack que consume la API pública de **Red Eléctrica de España (REE)**, persiste el balance eléctrico nacional en PostgreSQL y lo visualiza con gráficas interactivas en tiempo real.
 
---
 
## Stack técnico
 
| Capa | Tecnología |
|---|---|
| Backend | NestJS 10 · TypeScript strict |
| Base de datos | PostgreSQL 16 · TypeORM |
| Frontend | React 18 · TypeScript · Vite |
| Charts | Recharts |
| Estado async | TanStack React Query v5 |
| Estilos | Tailwind CSS |
| Contenedores | Docker · Docker Compose |
| Testing | Jest (backend) · Vitest (frontend) |
 
---
 
## Arranque en un comando
 
```bash
git clone https://github.com/inmanolgr/sistema-balance-electrico.git
cd ree-balance-system
docker compose up --build
```
 
| Servicio | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API REST | http://localhost:3001/api/v1 |
| Swagger UI | http://localhost:3001/api/docs |
| Health | http://localhost:3001/api/v1/health |
 
Al arrancar, el backend detecta si hay datos históricos en BD. Si no los hay, ingesta automáticamente los últimos 30 días antes de servir tráfico. No hace falta ninguna configuración adicional.
 
---
 
## Pipeline de datos
 
```
apidatos.ree.es
     │
     │  GET /es/datos/balance/balance-electrico
     │  ?start_date=...&end_date=...&time_trunc=day|hour
     │
     ▼
ReeApiClient          timeout 15s · retry exponencial 3 intentos
     │               no reintenta en 4xx · lanza inmediato
     ▼
ReeDataMapper         aplana JSON:API → MappedEntry[]
     │               filtra valores null/undefined
     │               parsea datetime strings → Date objects
     ▼
BalanceRepository     carga fuentes existentes en 1 query (sin N+1)
     │               upsert atómico de fuentes nuevas
     │               INSERT ... ON CONFLICT DO UPDATE en batch
     ▼
PostgreSQL            índice compuesto (datetime, time_trunc)
     │               índice en energy_sources.type
     ▼
REST API              GET /api/v1/balance?start_date&end_date&time_trunc
     │
     ▼
React Query           staleTime 0 · retry 3x con backoff exponencial
     │               queryKey plano [start, end, trunc]
     ▼
Dashboard             AreaChart · DonutChart · BarChart
```
 
### Frecuencia de ingesta
 
| Trigger | Acción |
|---|---|
| `onApplicationBootstrap` | Seed de los últimos 30 días si la BD está vacía |
| Cron `0 * * * *` | Ingesta de las últimas 25h con granularidad `hour` |
 
El solapamiento de 25h en el cron garantiza que no queden huecos aunque el sistema haya estado caído menos de un día.
 
---
 
## Arquitectura backend
 
```
src/
├── modules/
│   ├── balance/
│   │   ├── balance.controller.ts      GET /balance · /sources · /latest
│   │   ├── balance.service.ts         lógica de negocio · mapeo DTOs
│   │   ├── balance.repository.ts      acceso a datos · upsert batch
│   │   ├── dto/
│   │   │   ├── query-balance.dto.ts   validación con class-validator
│   │   │   └── balance-response.dto.ts
│   │   └── entities/
│   │       ├── balance-entry.entity.ts   enum TimeTrunc · índices compuestos
│   │       └── energy-source.entity.ts
│   ├── ree-ingestion/
│   │   ├── ree-api.client.ts          HTTP + retry · timeout
│   │   ├── ree-data.mapper.ts         transforma JSON:API → dominio
│   │   ├── ree-ingestion.service.ts   cron · bootstrap · orquestación
│   │   └── ree-api.types.ts           tipos de la respuesta REE
│   └── health/
│       └── health.controller.ts       siempre 200 · estado ingesta
└── app.module.ts
```
 
---
 
## Modelo de datos
 
### `energy_sources`
 
Catálogo de fuentes. Una fila por combinación `(type, title)` única encontrada en la API.
 
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | — |
| `type` | VARCHAR(100) | Tipo REE: `Eólica`, `Nuclear`, `Demanda en b.c.`… |
| `title` | VARCHAR(100) | Etiqueta de display |
| `group_id` | VARCHAR(50) | `Renovable` · `No-Renovable` · `Almacenamiento` · `Demanda en b.c.` |
| `color` | VARCHAR(10) | Color hexadecimal asignado por REE |
| `created_at` | TIMESTAMPTZ | — |
 
### `balance_entries`
 
Serie temporal de mediciones. `UNIQUE(energy_source_id, datetime, time_trunc)` garantiza idempotencia en la ingesta.
 
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | — |
| `energy_source_id` | FK | → energy_sources |
| `value` | DECIMAL(15,4) | Valor en GWh / MWh |
| `percentage` | DECIMAL(8,6) | Porcentaje sobre el total del mix |
| `datetime` | TIMESTAMPTZ | Timestamp de la medición |
| `time_trunc` | ENUM | `hour` · `day` · `month` · `year` |
| `created_at` | TIMESTAMPTZ | Primera ingesta |
| `updated_at` | TIMESTAMPTZ | Última actualización (útil para auditar upserts) |
 
**Índices:**
- `(datetime, time_trunc)` — compuesto, cubre la query principal
- `(energy_source_id, datetime)` — joins con filtro temporal
- `energy_sources.type` — acelera filtros y joins por categoría
---
 
## API REST
 
Base URL: `http://localhost:3001/api/v1` 
Documentación interactiva: `http://localhost:3001/api/docs`
 
### `GET /balance`
 
```bash
curl "http://localhost:3001/api/v1/balance?start_date=2024-01-01T00:00&end_date=2024-01-31T23:59&time_trunc=day"
```
 
| Parámetro | Tipo | Requerido | Default |
|---|---|---|---|
| `start_date` | ISO 8601 | ✓ | — |
| `end_date` | ISO 8601 | ✓ | — |
| `time_trunc` | `hour\|day\|month\|year` | — | `day` |
| `source_type` | string | — | — |
 
Validación: `end_date` debe ser posterior a `start_date` (validado con custom constraint en class-validator).
 
### `GET /balance/sources`
 
Catálogo completo de fuentes de energía en BD.
 
### `GET /balance/latest`
 
Último snapshot disponible. Prioriza granularidad `hour`, hace fallback a `day` si no hay datos horarios.
 
### `GET /health`
 
```json
{
 "status": "ok",
 "ingestion": { "isIngesting": false },
 "version": "1.0.0"
}
```
 
---
 
## Testing
 
### Backend
 
```bash
# Dentro del contenedor
docker compose exec backend npm test
 
# O localmente
cd backend && npm test
```
 
**21 tests · 3 suites · 0 fallos**
 
| Suite | Tests | Qué verifica |
|---|---|---|
| `ree-data.mapper.spec.ts` | 9 | Parseo JSON:API · filtrado nulls · metadatos · fechas · casos vacíos |
| `ree-api.client.spec.ts` | 4 | Retry en 5xx · no-retry en 4xx · agotamiento · endpoint correcto |
| `balance.service.spec.ts` | 8 | Consultas por rango · mapeo de tipos · fallback latest · NotFoundException |
 
### Frontend
 
```bash
# Dentro del contenedor
docker compose exec frontend npm test
 
# O localmente
cd frontend && npm test
```
 
| Suite | Tests | Qué verifica |
|---|---|---|
| `useBalanceData.test.ts` | 9 | Agrupación por datetime · filtro por sourceType · suma acumulada · colores · títulos únicos |
 
---
 
## Decisiones de diseño
 
### Upsert idempotente en lugar de insert
 
La ingesta periódica re-procesa rangos solapados. Con `INSERT ... ON CONFLICT DO UPDATE` la operación es idempotente: ejecutar el cron dos veces produce el mismo resultado que una. Esto simplifica el manejo de errores y permite reintentar sin duplicar datos.
 
### `TimeTrunc` como enum PostgreSQL
 
Usar un enum en lugar de `VARCHAR` garantiza integridad a nivel de base de datos — ningún proceso externo puede insertar un valor no contemplado como `'semana'` o `'trimestre'`.
 
### Carga de fuentes en una query (sin N+1)
 
En la versión original, por cada una de las 24 fuentes distintas se hacía una query `findOne`. El servicio de ingesta ahora carga todas las fuentes existentes de una sola vez al inicio de cada ciclo y solo hace upsert de las genuinamente nuevas, reduciendo el número de queries de O(n) a O(1) + O(nuevas).
 
### `updated_at` en balance_entries
 
Permite auditar exactamente cuándo se actualizó cada medición, lo que facilita la trazabilidad de la ingesta y el debugging de discrepancias.
 
### Seed en bootstrap vs migración
 
La ingesta inicial depende de la disponibilidad de la API REE en el momento del despliegue. Hacerlo en `onApplicationBootstrap` en lugar de en una migración permite que el sistema arranque aunque REE esté caída — el cron lo cubrirá en la siguiente hora — sin bloquear el proceso de arranque.
 
### QueryKey plano en React Query
 
```typescript
queryKey: ['balance', start_date, end_date, time_trunc]
```
 
Con valores planos en el array en lugar de un objeto anidado, React Query detecta cambios de parámetros de forma fiable sin depender de la comparación deep-equal del objeto.
 
### Limitaciones conocidas
 
- `isIngesting` es un flag en memoria — no funciona correctamente con múltiples instancias del backend. En producción se reemplazaría por un advisory lock de PostgreSQL o una tabla `ingestion_locks`.
- `synchronize: true` en TypeORM es apropiado para esta prueba técnica. En producción se usarían migraciones versionadas.
- Sin paginación en `/balance` — con granularidad `hour` y rangos largos el payload puede ser grande. En producción se añadiría `limit`/`offset` con un máximo validado.
---
 
## Variables de entorno
 
```env
# Backend (.env)
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ree_balance
DB_USER=ree_user
DB_PASSWORD=ree_secret_2024
REE_API_BASE_URL=https://apidatos.ree.es
INGESTION_CRON=0 * * * *
INGESTION_INITIAL_DAYS=30
```
 
Con Docker Compose todas las variables están preconfiguradas — no hace falta crear ningún `.env` para arrancar.
 
---
 
## Estructura del repositorio
 
```
ree-balance-system/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── modules/
│   │       ├── balance/
│   │       │   ├── balance.controller.ts
│   │       │   ├── balance.service.ts
│   │       │   ├── balance.repository.ts
│   │       │   ├── balance.service.spec.ts
│   │       │   ├── dto/
│   │       │   └── entities/
│   │       ├── ree-ingestion/
│   │       │   ├── ree-api.client.ts
│   │       │   ├── ree-api.client.spec.ts
│   │       │   ├── ree-data.mapper.ts
│   │       │   ├── ree-data.mapper.spec.ts
│   │       │   └── ree-ingestion.service.ts
│   │       └── health/
│   └── package.json
└── frontend/
   ├── Dockerfile
   ├── src/
   │   ├── api/
   │   │   └── balance.api.ts       fetch + queryKeys
   │   ├── components/
   │   │   ├── charts/
   │   │   │   ├── BalanceAreaChart.tsx
   │   │   │   ├── EnergyMixPieChart.tsx
   │   │   │   └── GenerationBarChart.tsx
   │   │   ├── ui/
   │   │   │   ├── DateRangePicker.tsx
   │   │   │   ├── ErrorMessage.tsx
   │   │   │   └── LoadingSpinner.tsx
   │   │   └── layout/
   │   │       └── Dashboard.tsx
   │   ├── hooks/
   │   │   └── useBalanceData.ts    hooks + transformaciones
   │   └── types/
   │       └── balance.types.ts
   └── package.json
```

