# Sistema de gestión de stock para ferreterías

### Integrantes:
> - Aguayo Andrés
> - Maida Fabricio
> - Villalba Ailén

## Qué problema resuelve

Controlar el stock a mano se complica a medida que crecen la cantidad y la variedad de productos, y más todavía cuando una ferretería tiene varios locales: cada uno ignora qué tiene el otro y, cuando falta un producto, se pierde la venta.

Este sistema está pensado para una ferretería con **varios locales de un mismo dueño**. Mantiene un único listado digital que muestra la disponibilidad de cada producto en todos los locales, permite derivar al cliente a otro local (incluso reservándole las unidades) en lugar de perder la venta, y deja registrado cada cambio de stock y quién lo hizo. El personal solo se ocupa de informar los movimientos a través de una interfaz y el sistema se encarga de mantener los datos coherentes.

Cada instalación sirve a un solo dueño. No es un servicio para muchos clientes.

### Quién lo usa

- **Empleado:** consulta el stock de todos los locales y registra ingresos y egresos en el suyo.
- **Gerente:** además hace ajustes de stock, administra los productos y el stock mínimo, y gestiona a los empleados de sus locales.
- **Dueño:** además administra los locales y los usuarios, y accede a todos los locales.

## Estructura del repositorio

```
client/    interfaz web (React y Vite)
server/    API REST (Node.js, Express y SQLite)
docs/      documentación técnica y de la API
```

| Si querés... | Andá a |
| --- | --- |
| Instalar y levantar el backend | [`server/README.md`](server/README.md) |
| Entender cómo está hecho el backend | [`docs/documentacion-backend.md`](docs/documentacion-backend.md) |
| Usar la API (endpoints, pedidos, respuestas y errores) | [`docs/referencia-api.md`](docs/referencia-api.md) |
| Saber por qué se hizo así | [`docs/decisiones-diseno.md`](docs/decisiones-diseno.md) |
| Trabajar en la interfaz | `client/` |

## Tecnología

**Backend:** Node.js, Express 5, TypeScript, Sequelize 6 con SQLite, zod (validación), umzug (migraciones), jose (JWT) y bcryptjs (contraseñas).

**Frontend:** React, TypeScript, Vite, HTML y CSS.

## Cómo empezar

**Requisitos:** Git, Node.js y npm. Las versiones con las que se desarrolla y se prueba están en [`server/README.md`](server/README.md#requisitos).

**1. Clonar el repositorio**

```
git clone https://github.com/AndresAguay0/gestor-de-stock-ferreterias.git
cd gestor-de-stock-ferreterias
```

**2. Instalar las dependencias**

```
cd server
npm install
cd ..
cd client
npm install
```

**3. Levantar el backend** (dentro de `server/`)

1. Crear el archivo `.env` a partir de `.env.example` y completar `JWT_SECRET`. El detalle está en [`server/README.md`](server/README.md#puesta-en-marcha).
2. Crear el primer dueño con `npm run create-owner`. Aplica las migraciones y pide el email y la contraseña.
3. Levantar el servidor con `npm run dev`.

**4. Levantar el frontend** (dentro de `client/`)

```
npm run dev
```

## Estado actual y pendientes

- **Backend:** las funciones principales están completas: stock por local, movimientos con historial, reservas entre locales, avisos de stock bajo, roles y permisos, y configuración. Incluye medidas de seguridad básicas (límite de intentos, encabezados de seguridad y registro de pedidos).
- **Pendientes del backend:** pruebas automáticas, transferencias entre locales y, antes de publicarlo restringir CORS. Las limitaciones conocidas están en la [documentación técnica](docs/documentacion-backend.md#6-limitaciones-conocidas).
- **Posible integración de un lector de códigos de barras:** los productos ya tienen código de barras y se pueden buscar por él.
- **Frontend:** falta completarlo.

## Documentación

- [README del backend](server/README.md): instalación, configuración y puesta en marcha.
- [Documentación técnica del backend](docs/documentacion-backend.md): comandos, configuración, estructura, reglas de negocio, diagramas y limitaciones.
- [Referencia de la API](docs/referencia-api.md): cada endpoint con su pedido, su respuesta y sus errores.
- [Decisiones de diseño](docs/decisiones-diseno.md): qué se decidió, qué alternativas había y qué costos se asumieron.