# Backend: sistema de gestión de stock para ferreterías

API REST del sistema. Permite que una ferretería con varios locales de un mismo dueño lleve un único listado de stock, consulte la disponibilidad de cada producto en todos los locales, derive a un cliente a otro local en lugar de perder la venta, y deje registrado cada cambio de stock.

## Qué hace

- **Stock por local**, con stock mínimo y una vista de los productos «bajo el mínimo».
- **Movimientos** de ingreso, egreso y ajuste: cada cambio de stock queda registrado, con quién lo hizo.
- **Reservas entre locales:** un local reserva unidades en otro para un cliente, por tiempo limitado.
- **Avisos** de stock bajo para el dueño y los gerentes del local.
- **Roles** (empleado, gerente y dueño) con permisos por local.
- **Configuración** del negocio.

**Estado actual:** las funciones principales del backend están completas. Todavía no hay pruebas automáticas. El detalle de las limitaciones está en la [documentación técnica](../docs/desarrollo.md#6-limitaciones-conocidas).

## Tecnología

Node.js, Express 5, TypeScript (modo estricto, módulos ES), Sequelize 6 con SQLite, zod (validación), umzug (migraciones), jose (JWT), bcryptjs (contraseñas), helmet y express-rate-limit (seguridad).

## Requisitos

- Node.js (v26.12.0)
- npm (11.20.0)

## Puesta en marcha

Todos los comandos se corren dentro de `server/`.

**1. Instalar las dependencias**

```bash
npm install
```

**2. Crear el archivo de configuración**

Copiar `.env.example` como `.env` (`cp .env.example .env`). Hay que completar `JWT_SECRET`, que es obligatoria y tiene que tener al menos 32 caracteres. Una forma de generarla:

```bash
node -p "crypto.randomBytes(48).toString('hex')"
```

Se pega el resultado en el `.env` (`JWT_SECRET=...`). El resto de las variables son opcionales: están descritas en la [documentación técnica](../docs/desarrollo.md#2-configuración-variables-de-entorno).

**3. Crear el primer dueño**

```bash
npm run create-owner
```

Aplica las migraciones (crea la base de datos si no existe) y pide el email y la contraseña (mínimo 8 caracteres) del dueño. Los dueños solo se crean con este comando: la API no los crea. Después el dueño crea locales, usuarios y productos desde la API.

**4. Levantar el servidor en desarrollo**

```bash
npm run dev
```

El servidor queda en `http://localhost:4000` (el puerto se cambia con `PORT` en el `.env`) y se reinicia solo al guardar un archivo. Para comprobar que anda, abrir esa dirección en el navegador: tiene que mostrar un mensaje de que la API está funcionando.

El resto de las rutas están en la [referencia de la API](../docs/referencia-api.md): empiezan con `POST /api/auth/login`, que devuelve el token que se manda en el resto de los pedidos.

## Comandos más usados

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Servidor en desarrollo con recarga automática |
| `npm run typecheck` | Chequear los tipos |
| `npm run build` y `npm start` | Compilar a `dist/` y arrancar la versión compilada |
| `npm run migrate:status` | Ver qué migraciones están aplicadas y cuáles faltan |
| `npm run create-owner` | Crear el primer dueño |
| `npm run reset-owner-password` | Recuperar la contraseña de un dueño |

La lista completa (con las variantes para la versión compilada) está en la [documentación técnica](../docs/desarrollo.md#1-comandos-útiles).

## Versión compilada

```bash
npm run build
npm start
```

`build` borra `dist/` y compila (si hay un error de tipos, no compila). Con la versión compilada, el dueño se crea con `npm run create-owner:prod`.

## Dónde está cada cosa

```
server/
  src/
    index.ts        arranque: base de datos, migraciones y servidor
    app.ts          Express: middlewares, rutas y manejo de errores
    container.ts    conexión de las piezas (repositories, services y controllers)
    config/         variables de entorno y conexión a la base
    db/             migraciones y transacciones
    models/         una tabla por archivo
    shared/         utilidades comunes
    scripts/        create-owner y reset-owner-password
    modules/        un directorio por funcionalidad
```

Si querés cambiar algo, empezá por acá:

| Querés cambiar... | Mirá |
| --- | --- |
| Un endpoint o los permisos de una ruta | `src/modules/<módulo>/<módulo>.routes.ts` |
| Una regla de negocio o un permiso fino | `src/modules/<módulo>/<módulo>.service.ts` |
| Una consulta a la base | `src/modules/<módulo>/<módulo>.repository.ts` |
| Qué datos se aceptan | `src/modules/<módulo>/<módulo>.schema.ts` |
| Una tabla | Una migración nueva en `src/db/migrations/` y el modelo en `src/models/` |
| Una variable de configuración | `src/config/env.ts` y `.env.example` |
| Cómo se conecta todo | `src/container.ts` y `src/app.ts` |

Los módulos son `auth`, `users`, `stores`, `products`, `inventory`, `stock-movements`, `reservations`, `notifications` y `settings`.

## Más información

- [Documentación técnica](../docs/desarrollo.md): comandos, configuración, estructura, reglas de negocio, diagramas y limitaciones.
- [Referencia de la API](../docs/referencia-api.md): cada endpoint con su pedido, su respuesta y sus errores.
- [Decisiones de diseño](../docs/desiciones-diseno.md): qué se decidió, qué alternativas había y qué costos se asumieron.
- [README del proyecto](../README.md): visión general del sistema y del repositorio.