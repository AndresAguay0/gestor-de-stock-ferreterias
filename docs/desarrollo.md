## 1. Comandos útiles:

Todos los comandos se corren con `npm run <comando>`.
| Comando | Función |
| --- | --- |
| `dev` | Levanta el servidor en desarrollo con recarga automática |
| `build` y `start` | Compila el proyecto a `dist/` y arranca |
| `typecheck` | Chequea los tipos |
| `migrate`, `migrate:down`, `migrate:status` | Aplica las migraciones, revierte la última, muestra el estado |
| `create-owner` | Crea el primer dueño |
| `reset-owner-password` | Recupera la contraseña de un dueño y cierra sus sesiones|

---
## 2. Estructura del código

```
server/
  .env  .env.example  package.json  tsconfig.json
  src/
    index.ts              arranque: base de datos, migraciones y servidor
    app.ts                arma Express: middlewares, rutas y manejo de errores
    container.ts          raíz de composición: crea y conecta repositories, services y controllers
    config/               env.ts (variables validadas) y database.ts (la instancia de Sequelize)
    db/                   umzug.ts, migrate.ts, transaction.ts y migrations/
    models/               un archivo por tabla, e index.ts que los carga todos
    shared/               utilidades comunes
    scripts/              create-owner, reset-owner-password y prompt
    modules/
      auth/  users/  stores/  products/  inventory/  stock-movements/
```
Cada módulo tiene sus archivos `(módulo).schema.ts`, `(módulo).repository.ts`, `(módulo).service.ts`, `(módulo).controller.ts`, `(módulo).routes.ts`.

### Capas:
| Capa | Qué hace | Qué no hace |
| --- | --- | --- |
| routes | Conectan una URL con sus middlewares y su controller | No tienen lógica |
| middlewares | Autenticación, permisos, validación y errores | No tienen reglas de negocio |
| controllers | Traducen HTTP: leen el pedido, llaman al service y responden | No tienen reglas de negocio ni consultas |
| services | Reglas de negocio y casos de uso; abren las transacciones | No conocen Express ni escriben consultas de Sequelize |
| repositories | Consultas con Sequelize; son los únicos que importan modelos | No tienen reglas de negocio ni conocen HTTP |
| models | Definición de las tablas y sus relaciones (se declaran en el archivo de cada modelo) | Sin lógica |

### Utilidades en `shared/`:

| Archivo | Para qué sirve |
| --- | --- |
| `AppError` | Error esperado, con código de estado |
| `errorHandler` | Convierte los errores en respuestas |
| `validate` y `parseOrThrow` | Validación con zod |
| `parseId` | Ids de ruta como enteros positivos |
| `auth` | `authenticate`, `requireRole`, `canAccessStore` y `getAuthUser` |
| `token` y `password` | JWT y bcrypt |
| `quantity` | Unidades, conversión de cantidades y `isBelowMinimum` |
| `events` | `EventBus` y el evento `stock.changed` |

---

## 3. Reglas de negocio

### 3.1 Permisos

| Acción | Empleado | Gerente | Dueño |
| --- | --- | --- | --- |
| Ver el stock de todos los locales | Sí | Sí | Sí |
| Ver el catálogo | Sí, sin los dados de baja | Sí | Sí |
| Registrar ingresos y egresos | En sus locales | En sus locales | En cualquier local |
| Hacer ajustes de stock | No | En sus locales | En cualquier local |
| Definir el stock mínimo | No | En sus locales | En cualquier local |
| Crear, editar y dar de baja productos | No | Sí | Sí |
| Ver el historial de movimientos | No | De sus locales | Todo |
| Ver y reasignar empleados | No | Los de sus locales, entre sus locales | Todos |
| Crear y editar usuarios, resetear contraseñas | No | No | Sí |
| Crear y editar locales | No | No | Sí |
| Cambiar la propia contraseña | Sí | Sí | Sí |

### 3.2 Unidades y cantidades

Cada producto tiene una sola unidad, que no se puede cambiar. La unidad define cuántos decimales admite la cantidad:

| Código | Unidad | Decimales |
| --- | --- | --- |
| `un`, `par`, `caja`, `bolsa`, `rollo` | Unidad, par, caja, bolsa, rollo | 0 |
| `m`, `m2` | Metro, metro cuadrado | 2 |
| `kg`, `l` | Kilogramo, litro | 3 |

Las cantidades se guardan como enteros multiplicados por 1000 (2,5 m se guarda como 2500) y la API las muestra como números normales. Los precios van en centavos enteros. No hay conversiones entre presentaciones: lo que se vende de dos formas son dos productos.

### 3.3 Stock y movimientos

- El stock solo cambia por movimientos; nunca se edita directamente. Los movimientos no se editan ni se borran: un error se corrige con un ajuste.
- Tipos y motivos: `in` (`purchase`, `customer_return`, `other`), `out` (`sale`, `damage`, `loss`, `other`) y `adjustment` (`count`, `correction`). Los motivos `other` y `correction` exigen una nota.
- En ingresos y egresos la cantidad es positiva y el sentido lo da el tipo. En un ajuste se informa el **stock real contado** (`countedQuantity`) y el sistema calcula la diferencia; un recuento sin diferencia se registra igual, con 0.
- **El stock negativo está permitido:** el movimiento se registra y la respuesta avisa con `negativeStock`. Un stock negativo siempre cuenta como bajo el mínimo.
- `belowMinimum` es verdadero si el stock es negativo, o si el mínimo es mayor que 0 y el stock es menor. Un mínimo de 0 significa sin alerta.
- El producto y el local tienen que estar activos para operar.
- `clientRef` es opcional y único: un segundo pedido con la misma referencia se rechaza (409) y no se aplica. Evita duplicados por doble clic o reintentos.
- Cada operación actualiza el stock y guarda el movimiento en una sola transacción exclusiva: los pedidos simultáneos se ordenan y ninguno se pierde.
- El inventario guarda una fila por producto y local solo cuando hay algo que registrar (un movimiento o un mínimo). Cambiar el mínimo nunca toca el stock.

### 3.4 Sesiones y seguridad implementada

- Contraseñas con bcrypt (costo 12), de 8 caracteres como mínimo y 72 bytes como máximo.
- El token es un JWT (HS256) que lleva solo el id del usuario y su versión de sesión (`tokenVersion`). En cada pedido se consulta al usuario en la base: desactivarlo o cambiarle el rol tiene efecto inmediato.
- Cambiar o resetear una contraseña sube `tokenVersion` y cierra todas las demás sesiones de esa persona.
- El login responde lo mismo para un email inexistente y para una contraseña incorrecta, y tarda lo mismo en ambos casos. Un usuario desactivado recibe un 403 claro, pero solo si la contraseña era correcta.
- Lo que un usuario no puede ver responde 404, no 403: así no se puede averiguar qué existe en otros locales. El 403 queda para cuando ve algo pero la acción no le corresponde.
- Los dueños solo se crean y se recuperan con los scripts del servidor; la API no los modifica.
- Los esquemas descartan campos desconocidos (no hay asignación masiva de campos). `passwordHash` y `tokenVersion` nunca salen en una respuesta.

### 3.5 Visibilidad y bajas

- Los empleados no ven los productos dados de baja (ni en listados ni por id); gerentes y dueño sí, con `includeInactive=true`.
- Usuarios, locales y productos no se borran: se desactivan.
- En el stock solo aparecen los locales activos.

## 4. Limitaciones conocidas

- SQLite admite un solo escritor (por eso el encolado) y su búsqueda no ignora los acentos.
- Los eventos viven en memoria: si el servidor se corta justo después de confirmar un movimiento, el aviso se pierde.
- Cambiar el stock mínimo no emite el evento `stock.changed`.
- Todavía no hay límite de intentos, `helmet` ni CORS restringido.
- Un gerente puede cambiar precios y dar de baja productos, que son globales, y no queda registro de quién lo hizo.
- Los empleados pueden listar locales desactivados con `includeInactive=true`.
- Faltan las reservas, las notificaciones y las transferencias entre locales.

## 5. Cómo agregar una funcionalidad

1. Si cambian las tablas: una migración nueva en `src/db/migrations/`, el modelo en `src/models/` y su línea en `src/models/index.ts`.
2. Esquemas de zod en `<módulo>.schema.ts`.
3. Repository con métodos por intención, que reciben una transacción opcional.
4. Service con las reglas, los permisos y las transacciones.
5. Controller (solo HTTP) y rutas con sus middlewares (`authenticate`, `requireRole`, `validate`).
6. Conectar todo en `src/container.ts` y `src/app.ts`.
7. Correr `npm run typecheck` y probar la funcionalidad agregada.
8. Actualizar estos documentación.