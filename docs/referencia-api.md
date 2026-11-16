## 1. Convenciones

- **Base:** todas las rutas salen de `/api`. La raíz `GET /` es una ruta de prueba pública.
- **Formato:** JSON, con el encabezado `Content-Type: application/json` en los pedidos que llevan cuerpo.
- **Autenticación:** el encabezado `Authorization: Bearer <token>` en todo salvo el login. El token se obtiene al iniciar sesión y dura 12 horas por defecto.
- **Permisos en las tablas:** **(Sesión)** es cualquier usuario con sesión, **(Gerente+)** es gerente o dueño, y **(Dueño)** es solo el dueño.
- **Datos:** los ids son enteros positivos y las fechas van en formato ISO 8601. Los campos desconocidos del cuerpo se descartan, los textos se recortan y los emails se guardan en minúsculas.
- **Cantidades:** números normales (por ejemplo 2.5). Cada unidad admite una cantidad de decimales distinta. **Precios:** `priceCents`, enteros en centavos (1500 son $15,00).
- **Paginación:** `limit` de 1 a 100 (50 por defecto) y `offset` desde 0. La respuesta es { items, total, limit, offset }, donde `total` es la cantidad de resultados sin paginar.
- **Bajas:** `includeInactive=true` incluye lo dado de baja. Nada se borra por la API: usuarios, locales y productos se desactivan con `isActive`.

## 2. Errores

Toda respuesta de error tiene la forma { msg, errors? }. En los errores de validación, `errors` es una lista de { field, message }.

| Código | Cuándo |
| --- | --- |
| 400 | Datos inválidos, o una regla de negocio no se cumple |
| 401 | Sin sesión o sesión inválida |
| 403 | La sesión es válida pero no tiene permiso para esa acción |
| 404 | No existe, o el usuario no puede verlo |
| 409 | Conflicto: dato único repetido |
| 500 | Error interno |

Un **401** significa que la sesión no sirve: token ausente, inválido o vencido, usuario desactivado, o token anterior a un cambio de contraseña. La interfaz tiene que volver al login. En el login, un usuario desactivado recibe 403.

## 3. Autenticación

| Ruta | Quién | Pedido | Respuesta y reglas |
| --- | --- | --- | --- |
| `POST /api/auth/login` | Público | { email, password } | { token, user }. 401 si el email o la contraseña no coinciden; 403 si el usuario está desactivado |
| `GET /api/auth/me` | Sesión | — | El usuario de la sesión, con sus locales |
| `POST /api/auth/change-password` | Sesión | { currentPassword, newPassword } | { token } nuevo. Las demás sesiones de la persona se cierran. 400 si la actual es incorrecta, si la nueva es igual a la actual o si no cumple las reglas (mínimo 8 caracteres y máximo 72 bytes) |

La respuesta del usuario es { id, email, role, isActive, stores, createdAt, updatedAt }, donde `stores` es la lista de sus locales. Nunca incluye datos internos.

## 4. Usuarios

| Ruta | Quién | Pedido | Respuesta y reglas |
| --- | --- | --- | --- |
| `GET /api/users` | Gerente+ | `includeInactive` (solo tiene efecto para el dueño) | El dueño ve todos, ordenados por email. El gerente ve solo los empleados activos de sus locales |
| `GET /api/users/:id` | Gerente+ | — | El usuario con sus locales. Para un gerente, 404 si está fuera de su alcance |
| `POST /api/users` | Dueño | { email, password, role, storeIds } | 201. `role` es `manager` o `employee` (los dueños no se crean por la API). Un empleado lleva exactamente un local y un gerente uno o más, activos y sin repetir. 409 si el email ya existe |
| `PATCH /api/users/:id` | Dueño | { email?, role?, isActive?, storeIds? }, al menos un campo | El usuario actualizado. 403 si es un dueño. 400 si el resultado dejaría a un empleado sin exactamente un local |
| `PATCH /api/users/:id/stores` | Gerente+ | { storeIds } | El dueño mueve a cualquier usuario que no sea dueño. El gerente solo mueve empleados activos de sus locales, hacia exactamente uno de sus locales: 404 si el empleado está fuera de su alcance y 403 si el destino no es suyo |
| `PUT /api/users/:id/password` | Dueño | { newPassword } | 204 sin cuerpo. Cierra todas las sesiones de ese usuario. 403 si es un dueño |

## 5. Locales

| Ruta | Quién | Pedido | Respuesta y reglas |
| --- | --- | --- | --- |
| `GET /api/stores` | Sesión | `includeInactive` | Lista ordenada por nombre |
| `GET /api/stores/:id` | Sesión | — | Un local |
| `POST /api/stores` | Dueño | { name, address } | 201. El nombre admite hasta 100 caracteres y la dirección hasta 255 |
| `PATCH /api/stores/:id` | Dueño | { name?, address?, isActive? }, al menos un campo | El local actualizado. Desactivarlo es la forma de darlo de baja |

Un local es { id, name, address, isActive, createdAt, updatedAt }.

## 6. Productos

Es un catálogo global: el mismo producto para todos los locales.

| Ruta | Quién | Pedido | Respuesta y reglas |
| --- | --- | --- | --- |
| `GET /api/products` | Sesión | `search`, `category`, `barcode`, `includeInactive`, `limit`, `offset` | { items, total, limit, offset }, ordenado por nombre. `search` va por palabras: cada una tiene que aparecer en el nombre, la descripción, el SKU o el código de barras, sin distinguir mayúsculas (no ignora acentos). `category` y `barcode` son exactos (`barcode` está pensado para el escáner). `includeInactive` no tiene efecto para los empleados |
| `GET /api/products/:id` | Sesión | — | Un producto. 404 para un empleado si está dado de baja |
| `POST /api/products` | Gerente+ | { name, description?, category, unit, priceCents, sku?, barcode? } | 201. El SKU se guarda en mayúsculas. 409 si el SKU o el código de barras ya existen |
| `PATCH /api/products/:id` | Gerente+ | { name?, description?, category?, priceCents?, sku?, barcode?, isActive? }, al menos un campo | El producto actualizado. Mandar null en `description`, `sku` o `barcode` los borra. La unidad no se puede cambiar (400) |

Límites: `name` hasta 150 caracteres, `description` hasta 2000, `category` hasta 100, `sku` y `barcode` hasta 64, y `priceCents` entero entre 0 y 2.000.000.000.

Un producto es { id, name, description, category, unit, priceCents, sku, barcode, isActive, createdAt, updatedAt }.

## 7. Inventario

El stock de cada producto en todos los locales **activos**. Los locales sin fila de inventario aparecen con ceros.

| Ruta | Quién | Pedido | Respuesta y reglas |
| --- | --- | --- | --- |
| `GET /api/inventory` | Sesión | Los mismos filtros y la misma paginación que `/api/products` | { items, total, limit, offset }, donde cada item es { product, stores } |
| `GET /api/inventory/:productId` | Sesión | — | { product, stores }. 404 para un empleado si el producto está dado de baja |
| `PATCH /api/inventory/:productId/stores/:storeId` | Gerente+ | { minQuantity } | El { product, stores } actualizado. `minQuantity` no puede ser negativo y respeta los decimales de la unidad. El gerente solo en sus locales (403 si no); 404 si el producto no existe; 400 si el local está desactivado |

Cada elemento de `stores` es { storeId, storeName, quantity, minQuantity, belowMinimum }. `belowMinimum` es verdadero si el stock es negativo, o si el mínimo es mayor que 0 y el stock es menor; un mínimo de 0 significa sin alerta. Cambiar el mínimo nunca modifica el stock.

## 8. Movimientos de stock

La única forma de cambiar el stock. Los movimientos no se editan ni se borran: un error se corrige con un ajuste.

| Ruta | Quién | Pedido | Respuesta y reglas |
| --- | --- | --- | --- |
| `POST /api/movements` | Sesión | Ingreso o egreso: { productId, storeId, type, reason, quantity, note?, clientRef? }. Ajuste: { productId, storeId, type, reason, countedQuantity, note?, clientRef? } | 201 con { movement, stock } |
| `GET /api/movements` | Gerente+ | `productId`, `storeId`, `userId`, `type`, `reason`, `from`, `to`, `limit`, `offset` | { items, total, limit, offset }, del más nuevo al más viejo |

**Tipos y motivos:**

| `type` | `reason` permitidos | Cantidad |
| --- | --- | --- |
| `in` (ingreso) | `purchase`, `customer_return`, `other` | `quantity`, mayor que 0: cuánto entra |
| `out` (egreso) | `sale`, `damage`, `loss`, `other` | `quantity`, mayor que 0: cuánto sale |
| `adjustment` (ajuste) | `count`, `correction` | `countedQuantity`, desde 0: el stock real contado; el sistema calcula la diferencia |

Los motivos `other` y `correction` exigen una `note` (hasta 255 caracteres). `clientRef` es opcional (hasta 64 caracteres) y único en todo el sistema: si ya existe un movimiento con esa referencia, el pedido se rechaza con 409 y no se aplica nada. Conviene mandar uno distinto por cada envío, para evitar duplicados por doble clic o reintentos. El usuario del movimiento es siempre el de la sesión.

**Registrar (`POST`):**

- Un empleado hace ingresos y egresos en sus locales. Un gerente también hace ajustes, en sus locales. El dueño hace todo en cualquier local. Un ajuste de un empleado da 403, y operar en un local sin acceso también.
- 404 si el producto no existe (o está dado de baja, para un empleado) o si el local no existe (solo lo ve el dueño; para el resto es un 403). 400 si el producto está dado de baja (gerente y dueño), si el local está desactivado, o si la cantidad no respeta los decimales de la unidad. 409 si `clientRef` ya se usó.
- **El stock negativo está permitido:** un egreso mayor al stock se registra igual y la respuesta lo avisa.
- La respuesta es { movement, stock }. `movement` es { id, productId, storeId, userId, type, reason, quantity, resultingQuantity, note, clientRef, createdAt }, donde `quantity` es la variación con signo (un egreso de 3 sale como -3; en un ajuste es la diferencia, que puede ser 0) y `resultingQuantity` es el stock después del movimiento. `stock` es { productId, storeId, storeName, quantity, minQuantity, belowMinimum, negativeStock }.

**Historial (`GET`):**

- Solo gerente y dueño. El gerente ve únicamente los movimientos de sus locales y recibe 403 si filtra por un local ajeno.
- `from` es inclusivo y `to` es exclusivo; conviene mandar fecha y hora con zona horaria (por ejemplo 2026-11-14T00:00:00-03:00). 400 si `from` no es anterior a `to`.
- Cada elemento es el movimiento más { product: { id, name, unit }, store: { id, name }, user: { id, email } }.

## 9. Unidades

| Código | Unidad | Decimales |
| --- | --- | --- |
| `un`, `par`, `caja`, `bolsa`, `rollo` | Unidad, par, caja, bolsa, rollo | 0 |
| `m`, `m2` | Metro, metro cuadrado | 2 |
| `kg`, `l` | Kilogramo, litro | 3 |

Una cantidad con más decimales de los que admite la unidad se rechaza con un 400. La interfaz tiene que limitar los campos de cantidad según la unidad del producto.
