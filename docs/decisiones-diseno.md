# Decisiones de diseño

Este documento registra las decisiones importantes del backend: qué problema había, qué caminos se evaluaron (incluso no hacer nada) y qué se eligió, con los costos que se aceptaron. Cada decisión tiene la misma forma: **contexto**, **alternativas**, **decisión** y **costos asumidos**.

Para ver cómo está armado el código, la [documentación técnica](documentacion-backend.md) explica la estructura, las capas y las reglas de negocio, y la [referencia de la API](referencia-api.md) describe cada endpoint.

## Resumen

| # | Tema | Se eligió | Costo principal |
| --- | --- | --- | --- |
| 1 | Motor de base de datos | SQLite | Un solo escritor y un solo proceso del servidor |
| 2 | Cambios de la base | Migraciones | Mantener alineados los modelos y las migraciones |
| 3 | Cantidades y precios | Enteros por 1000 y centavos | Convertir en los bordes del sistema |
| 4 | Stock negativo y stock reservado | Avisar, no bloquear | El aviso depende de que la interfaz lo muestre |
| 5 | Vencimiento de reservas | Estado calculado, sin procesos en segundo plano | Filtrar por fecha en cada consulta |
| 6 | Pedidos simultáneos | Cola de transacciones | Las transacciones no se pueden anidar |
| 7 | Avisos de stock bajo | Eventos en memoria | Un corte puede perder un aviso |
| 8 | Sesiones | JWT con versión de sesión | Una consulta a la base por pedido |
| 9 | Recursos ajenos | 404 en lugar de 403 | Más difícil de depurar |
| 10 | Fuerza bruta de contraseñas | Límite de intentos fallidos | No frena ataques desde muchas direcciones |
| 11 | Bajas | Desactivar en lugar de borrar | Los datos se acumulan |
| 12 | Arquitectura | Capas con inyección manual de dependencias | Más archivos y conexión manual |

## 1. Motor de base de datos: SQLite

**Contexto.** El sistema se instala una vez por dueño (no es un servicio para muchos clientes) y lo usan pocas personas a la vez. Además tiene que poder instalarse y demostrarse en cualquier computadora. Al comienzo se consideró migrar a PostgreSQL.

**Alternativas.**
- *PostgreSQL:* concurrencia real y más herramientas, pero obliga a instalar, configurar y mantener un servicio aparte.
- *SQLite:* toda la base es un archivo y no hay nada que instalar.
- *Dejar la puerta abierta a los dos:* se descartó, porque obligaba a diseñar y probar para dos motores.

**Decisión.** SQLite como motor definitivo. Como todo el acceso pasa por Sequelize y por los repositories, un cambio de motor futuro quedaría concentrado en pocos lugares (aunque habría que revisar las migraciones y la cola de transacciones).

**Costos asumidos.**
- SQLite admite un solo escritor a la vez: de ahí salen la cola de transacciones (decisión 6) y la regla de **un solo proceso del servidor**.
- Su búsqueda no ignora los acentos.
- No hay réplicas ni copias de seguridad automáticas.
- Conviene volver a evaluar el motor si hay que atender a varias instalaciones desde un mismo servidor o si se necesita más de un proceso.

## 2. Cambios de la base: migraciones y no `sync`

**Contexto.** La estructura de la base evolucionó varias veces con datos ya cargados, y hay cosas que solo viven en la base: claves foráneas `RESTRICT`, índices y la fila única de configuración.

**Alternativas.**
- *`sequelize.sync()` desde los modelos:* es lo más simple, pero solo crea las tablas que faltan; si después cambia un modelo, una base existente no se entera. La variante `alter` intenta adaptarla y en SQLite lo hace recreando tablas, lo que es delicado y puede perder datos.
- *Una sola migración inicial que reemplace a todas:* limpiaría la historia, pero obliga a recrear las bases existentes.
- *Migraciones con `umzug`:* cada cambio es un archivo con fecha y hora; el servidor aplica al arrancar las que faltan.

**Decisión.** Migraciones con `umzug`, aplicadas automáticamente al arrancar. No se usa `sync`. Las migraciones ya aplicadas no se editan: un cambio nuevo es una migración nueva.

**Costos asumidos.**
- La estructura se describe en dos lugares (modelos y migraciones) y hay que mantenerlos alineados.
- La historia incluye migraciones que reemplazaron tablas, con un `down` que lanza error a propósito (son irreversibles).
- Una migración que falla impide que el servidor arranque (lo hace de forma explícita, con código de salida 1).

## 3. Cantidades y precios: enteros

**Contexto.** Los productos se venden por unidad, metro, kilo o litro, con distinta cantidad de decimales. Los números decimales de las computadoras acumulan errores de redondeo (por ejemplo, 0,1 + 0,2 no da exactamente 0,3), y en un stock eso es inaceptable.

**Alternativas.**
- *Números decimales (`float`):* simples, pero imprecisos.
- *Texto o un tipo decimal exacto:* SQLite no tiene un decimal exacto nativo.
- *Enteros escalados:* se guarda un entero y se sabe cuántos decimales representa.

**Decisión.** Las cantidades se guardan como enteros multiplicados por 1000 (2,5 m se guarda como 2500), y cada unidad admite una cantidad máxima de decimales (0, 2 o 3). La API recibe y devuelve números normales. Los precios van en centavos enteros (`priceCents`). No hay conversión entre presentaciones: lo que se vende de dos formas son dos productos.

**Costos asumidos.**
- La conversión se hace en los bordes (`toStored` y `fromStored`) y hay que acordarse de usarla.
- Hay un máximo de tres decimales.
- La interfaz tiene que limitar los campos de cantidad según la unidad del producto.

## 4. Stock negativo y stock reservado: avisar, no bloquear

**Contexto.** En el mostrador, la venta ocurre aunque el sistema diga que no hay stock: puede haber una carga atrasada o un error de recuento. Y con las reservas aparece otro caso: un empleado puede vender, sin saberlo, unidades que otro local le prometió a un cliente.

**Alternativas.**
- *Bloquear* el movimiento con un error: protege el dato, pero frena una venta real y obliga a falsear el stock para poder seguir.
- *Permitir sin decir nada:* esconde el problema.
- *Permitir y avisar:* se registra la realidad y se informa de la inconsistencia.

**Decisión.** Un egreso mayor al stock se registra igual y la respuesta lo avisa con `negativeStock`. Vender stock reservado también se permite y se avisa con `reservedStockAffected`. En cambio, **crear** una reserva sí es estricto: solo se puede reservar lo que está disponible. Un stock negativo cuenta siempre como bajo el mínimo.

**Costos asumidos.**
- El aviso viaja en la respuesta: solo sirve si la interfaz lo muestra.
- Puede quedar una reserva sin respaldo; al retirarla, el stock queda negativo y también se avisa.

## 5. Vencimiento de reservas: un estado calculado

**Contexto.** Una reserva vence y el stock tiene que volver a estar disponible sin que nadie haga nada.

**Alternativas.**
- *Un proceso periódico* que marque las reservas vencidas: es lo más intuitivo, pero agrega una pieza que puede fallar, atrasarse o correr dos veces.
- *Calcular el vencimiento al consultar.*

**Decisión.** En la base solo se guardan los estados `active`, `picked_up` y `cancelled`. El estado `expired` **se calcula**: una reserva activa cuya fecha de vencimiento ya pasó. El stock disponible solo descuenta las reservas activas que no vencieron. No hay procesos en segundo plano. Los services reciben una función que devuelve la hora actual (por defecto la real), para poder controlar el tiempo.

**Costos asumidas.**
- Cada cálculo del disponible filtra por fecha (hay un índice por local, producto, estado y vencimiento para que sea rápido).
- Una reserva vencida sigue figurando como activa en la base hasta que se cancela o se consulta (para quien consulta siempre sale como vencida).
- No existe un evento «venció la reserva».

## 6. Pedidos simultáneos: una cola de transacciones

**Contexto.** Dos ventas al mismo tiempo del mismo producto leen el mismo stock y escriben, y una puede pisar a la otra. Además, SQLite falla con «database is locked» si dos escrituras compiten.

**Alternativas.**
- *Confiar en el bloqueo de SQLite y reintentar:* es frágil y no resuelve la carrera entre leer y escribir.
- *Bloqueos por fila:* SQLite no los tiene.
- *Cambiar de motor* (ver decisión 1).
- *Encolar las transacciones en la aplicación.*

**Decisión.** Un `TransactionRunner` que ejecuta las transacciones **de a una**, en orden. Tiene dos modos: `run` para escrituras comunes y `runExclusive` (que toma el bloqueo de escritura al empezar) para cuando se lee y después se escribe el mismo dato, como en un movimiento de stock o en la creación de una reserva.

**Costos asumidos.**
- Las transacciones **no se pueden anidar**: una dentro de otra se queda esperando para siempre. Por eso, cuando un service necesita la lógica de otro (por ejemplo, retirar una reserva registra un egreso), esa lógica se expone en un método que recibe la transacción.
- La cola vive en el proceso: solo puede haber **un proceso del servidor** (decisión 1).
- Se evitan `findOrCreate` y `upsert` de Sequelize, porque abren su propia transacción por fuera de la cola.

## 7. Avisos de stock bajo: eventos en memoria

**Contexto.** Hay que avisar cuando el stock de un producto cruza el mínimo hacia abajo, sin que el módulo de movimientos tenga que conocer el de notificaciones, y sin que un fallo al avisar rompa el movimiento.

**Alternativas.**
- *Crear el aviso dentro de la misma transacción del movimiento:* es consistente, pero acopla los módulos y alarga la transacción exclusiva, que es justo la que serializa a todos.
- *Una cola persistente o un servicio externo* (Redis, RabbitMQ, etc.): es lo más robusto, pero agrega infraestructura desproporcionada para este sistema.
- *Una tabla de eventos pendientes* (patrón *outbox*): robusto y sin infraestructura, con más código.
- *Un bus de eventos en memoria,* emitido recién después de confirmar la transacción.

**Decisión.** Un `EventBus` en memoria. El movimiento emite `stock.changed` una vez confirmada la transacción, y un listener del módulo de notificaciones crea los avisos. Si el listener falla, el error queda en el registro y el movimiento no se ve afectado. Cada aviso guarda el stock y el mínimo del momento.

**Costos asumidos.**
- Si el servidor se corta justo después de confirmar un movimiento, ese aviso se pierde.
- El aviso aparece unos instantes después de la respuesta, de forma asíncrona.
- Si en el futuro los avisos se vuelven críticos (por ejemplo, por correo electrónico), el paso natural es la tabla de eventos pendientes.

## 8. Sesiones: JWT con versión de sesión

**Contexto.** Un token firmado (JWT) vale hasta que vence y no se puede revocar por sí solo. Pero hace falta que cambiar la contraseña, desactivar a un usuario o cambiarle el rol tenga efecto inmediato.

**Alternativas.**
- *Sesiones guardadas en el servidor* (tabla de sesiones y cookie): revocables, pero hay que administrarlas.
- *JWT de vida corta con renovación:* complejiza el cliente y sigue sin revocar de inmediato.
- *JWT con una versión de sesión* (`tokenVersion`) y lectura del usuario en cada pedido.

**Decisión.** El token lleva solo el id del usuario y su versión de sesión, firmado con HS256. En cada pedido se lee al usuario de la base: si fue desactivado, cambió de rol o su versión de sesión es otra, el token deja de servir. Cambiar o resetear una contraseña sube la versión y cierra todas las demás sesiones de esa persona. Las contraseñas usan bcrypt (costo 12).

**Costos asumidos.**
- Una consulta a la base por pedido (barata con SQLite local).
- El token viaja en el encabezado `Authorization` y lo guarda el cliente: su cuidado frente a ataques de scripts (XSS) depende de la interfaz.
- bcrypt solo mira los primeros 72 bytes de una contraseña: por eso ese es el máximo permitido.

## 9. Recursos ajenos: 404 en lugar de 403

**Contexto.** Un 403 («existe, pero no podés») le dice al usuario que algo existe. Con varios locales y usuarios, eso permitiría averiguar qué hay en locales ajenos.

**Alternativas.** Responder siempre 403; responder siempre 404; o usar los dos según el caso.

**Decisión.** Si el usuario **no puede ver** un recurso, responde 404, igual que si no existiera. El 403 queda para cuando el usuario ve el recurso pero la acción no le corresponde.

**Costos asumidos.** Es más difícil de depurar, y la interfaz no puede distinguir «no existe» de «no es tuyo». Es justamente la intención.

## 10. Fuerza bruta de contraseñas: límite de intentos fallidos

**Contexto.** Sin ninguna protección, alguien puede probar contraseñas indefinidamente contra el login.

**Alternativas.**
- *Límite por dirección IP sola:* varias personas detrás de una misma red compartirían el castigo.
- *Bloquear la cuenta tras N fallos:* cualquiera podría dejar afuera a un usuario legítimo a propósito.
- *Contar todos los intentos:* penaliza a quien usa el sistema bien.
- *Verificación en dos pasos o CAPTCHA:* fuera del alcance del proyecto.
- *Limitar solo los intentos fallidos, por combinación de IP y email.*

**Decisión.** El login admite 10 intentos fallidos cada 15 minutos por combinación de IP y email (normalizado: sin espacios y en minúsculas), y el cambio de contraseña 5 por usuario. Pasado el límite responde 429 con `Retry-After`. Los valores se configuran con variables de entorno.

**Costos asumidos.**
- No frena un ataque repartido entre muchas direcciones.
- Los contadores viven en memoria y se reinician con el servidor.
- Detrás de un proxy hay que indicar cuántos hay (`TRUST_PROXY`), o todos los pedidos parecerían venir de la misma dirección.

## 11. Bajas: desactivar en lugar de borrar

**Contexto.** Cada cambio de stock queda registrado con quién lo hizo. Si se pudieran borrar usuarios, productos o locales, el historial quedaría roto.

**Alternativas.** Borrado físico con eliminación en cascada; borrado lógico con una marca de fecha; o desactivar con un indicador (`isActive`).

**Decisión.** Los datos de negocio no se borran: se desactivan con `isActive`. Las claves foráneas son `RESTRICT` (la base impide borrar algo con historial) y los movimientos son inmutables: un error se corrige con un ajuste, no editando el movimiento.

**Costos asumidos.** Los datos se acumulan, y cada listado tiene que decidir si incluye lo dado de baja (`includeInactive`; los empleados nunca lo ven).

## 12. Arquitectura: capas, módulos e inyección manual

**Contexto.** Un equipo chico necesita un código que cualquiera pueda entender y cambiar sin romper otra parte.

**Alternativas.**
- *Todo junto:* rutas que consultan la base directamente. Rápido al principio, pero las reglas de negocio quedan mezcladas con HTTP y con las consultas.
- *Un framework con inyección de dependencias* (por ejemplo NestJS): estructura completa, pero con mucho que aprender y configurar.
- *Una clase base genérica de repositorio:* menos código repetido, pero esconde la intención de cada consulta.
- *Capas simples con las piezas conectadas a mano.*

**Decisión.** Módulos por funcionalidad y, en cada uno, capas con una responsabilidad clara: rutas, middlewares, controller (solo HTTP), service (reglas y permisos) y repository (consultas). Solo los repositories importan modelos. Las piezas se crean una sola vez y se conectan a mano en `container.ts`. Los repositories tienen métodos con nombre por intención. No se agregó ningún patrón sin un problema concreto que resolver.

**Costos asumidos.**
- Más archivos por módulo.
- La conexión manual en `container.ts` y `app.ts`: si algo no se conecta, el chequeo de tipos o el arranque lo muestran enseguida.
- A cambio, los services no conocen Express y reciben sus dependencias, así que se pueden probar sin levantar un servidor, incluso controlando el reloj.

## Patrones de diseño: qué se usa y qué no

La versión anterior de este documento decía que no se usaba ningún patrón. En la práctica el código usa algunos, sin forzarlos:

| Patrón | Dónde aparece | Qué problema resuelve |
| --- | --- | --- |
| Repository | `*.repository.ts` | Aísla las consultas de Sequelize: solo ahí se importan modelos |
| Inyección de dependencias manual | `container.ts` | Cada pieza recibe lo que usa, sin crearlo por su cuenta |
| Observer (Patrón de comportamiento visto en clase) | `EventBus` y el listener de notificaciones | Desacopla los movimientos de las notificaciones |
| Cadena de middlewares | Rutas de Express | Autenticación, permisos y validación en orden, antes del controller |

Lo que no se usa: clases base genéricas, un framework de inyección de dependencias ni patrones creados «por si acaso».

## Decisiones de no hacer (por ahora)

Cosas que se evaluaron y se dejaron para más adelante, con el motivo:

- **Modo WAL de SQLite.** Permitiría que lecturas y escrituras no se bloqueen entre sí. Con un solo proceso, escrituras encoladas y pocos usuarios la ganancia es chica; agrega archivos auxiliares junto a la base y complica las copias. Se puede activar más adelante sin tocar los datos.
- **Copias de seguridad automáticas.** Se diseñó una solución (copia consistente con el servidor funcionando, verificación y restauración), pero no se implementó porque el sistema todavía es un prototipo sin datos reales. Es lo primero que habría que retomar antes de usarlo con información real.
- **CORS restringido.** Hoy el servidor acepta pedidos de cualquier origen. Como la autenticación va por un encabezado y no por cookies, el riesgo es bajo, pero hay que restringirlo a los orígenes permitidos cuando el cliente y la API estén en dominios distintos. El servidor lo advierte al arrancar en producción.
- **Registro de quién cambia precios o da de baja productos.** Un gerente puede hacerlo y no queda constancia de quién fue. La trazabilidad del sistema es la del stock. Si hace falta, se suma una tabla aparte que se escriba en la misma transacción del cambio.

## Ideas para más adelante

Siguen sin implementarse porque hoy no hay un problema concreto que resuelvan:

- **Adapter para un lector de códigos de barras.** Los productos ya tienen `barcode` y se pueden buscar por él. Un Adapter aislaría el protocolo de cada lector para que el resto del sistema no dependa de ninguno.
- **Factory para las formas de facturar una venta.** Si aparecen varias formas de emitir una factura, una Factory permitiría crearlas de manera uniforme.
- **Tabla de eventos pendientes** si los avisos pasan a ser críticos (decisión 7).
- **Otro motor de base de datos** si el sistema pasa a atender a varias instalaciones o necesita más de un proceso (decisión 1).