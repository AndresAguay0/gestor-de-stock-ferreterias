

# Frontend – Sistema de gestión de stock para ferreterías

Cliente web del proyecto Grupo 24. Permite iniciar sesión y utilizar las funciones del sistema de gestión de stock para ferreterías, según el rol y los permisos del usuario.

El frontend se comunica con la API del backend mediante peticiones HTTP. La dirección `/api` se redirige al servidor del backend a través del proxy configurado en Vite.

## Qué hace

- **Inicio de sesión:** permite ingresar al sistema y mantiene la sesión durante el uso de la aplicación.
- **Panel principal:** muestra las secciones disponibles para el usuario.
- **Stock:** permite consultar el inventario por sucursal, buscar productos, registrar movimientos y administrar productos según los permisos.
- **Reservas:** permite crear, consultar, retirar y cancelar reservas.
- **Notificaciones:** muestra avisos de stock bajo y permite marcarlos como leídos.
- **Configuración:** permite al dueño modificar la configuración general del negocio.
- **Sucursales y usuarios:** permite al dueño administrar sucursales, empleados y gerentes.

## Tecnología

React 19, TypeScript y Vite. El cliente consume la API del backend, desarrollado con Express, Sequelize y SQLite.

## Requisitos

- Node.js y npm instalados.
- El backend configurado y en ejecución.
- Las dependencias del frontend instaladas.

## Puesta en marcha

Todos los comandos se ejecutan dentro de `client/`.

**1. Instalar las dependencias**

```bash
npm install
```

**2. Iniciar el frontend en desarrollo**

```bash
npm run dev
```

Vite muestra en la terminal la dirección local donde se puede abrir la aplicación.

**3. Comprobar el backend**

El frontend espera que el backend esté disponible en `http://localhost:4000`, según la configuración del proyecto. El proxy de Vite redirige las peticiones que comienzan con `/api` hacia ese servidor.

## Comandos más usados

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Iniciar el servidor de desarrollo de Vite |
| `npm run build` | Verificar los tipos y generar la versión compilada |
| `npm run lint` | Ejecutar el análisis estático del código |

## Dónde está cada cosa

```text
client/
└── src/
    ├── main.tsx                  Entrada de la aplicación
    ├── App.tsx                   Raíz: sesión y navegación básica
    ├── App.css                   Estilos de la aplicación
    ├── index.css                 Estilos globales
    ├── auth/
    │   └── AuthContext.tsx       Contexto y funciones de autenticación
    ├── api/
    │   ├── client.ts             Peticiones HTTP y manejo de errores
    │   ├── auth.api.ts           Operaciones relacionadas con autenticación
    │   └── management.api.ts     Operaciones de gestión y tipos de datos
    └── pages/
        ├── Login.tsx             Inicio de sesión
        ├── Dashboard.tsx         Panel y navegación entre secciones
        ├── StockManagement.tsx   Productos, inventario y movimientos
        ├── Reservations.tsx      Reservas
        ├── Notifications.tsx     Notificaciones
        └── Settings.tsx          Configuración
```

## Cómo se organiza

1. `main.tsx` monta el componente principal de la aplicación.
2. `App.tsx` utiliza el contexto de autenticación para decidir si muestra la pantalla de inicio de sesión o el panel.
3. `Dashboard.tsx` organiza las secciones del sistema y controla cuáles están disponibles según el rol.
4. Las páginas muestran los formularios, tablas y acciones de cada sección.
5. Las páginas llaman a los métodos de `management.api.ts` para comunicarse con el backend.
6. `client.ts` centraliza las peticiones HTTP, agrega el token de autenticación y maneja las respuestas y los errores.

## Dónde hacer cambios

| Querés cambiar... | Mirá |
| --- | --- |
| La pantalla de inicio de sesión | `src/pages/Login.tsx` |
| La estructura principal o la navegación | `src/App.tsx` y `src/pages/Dashboard.tsx` |
| Los estilos de la aplicación | `src/App.css` y `src/index.css` |
| Los productos, el inventario o los movimientos | `src/pages/StockManagement.tsx` |
| Las reservas | `src/pages/Reservations.tsx` |
| Las notificaciones | `src/pages/Notifications.tsx` |
| La configuración del negocio | `src/pages/Settings.tsx` |
| Los métodos que llaman a la API de gestión | `src/api/management.api.ts` |
| Las peticiones HTTP y el manejo de errores | `src/api/client.ts` |
| La autenticación y la sesión | `src/auth/AuthContext.tsx` y `src/api/auth.api.ts` |

## Más información

El frontend presenta la interfaz y envía las operaciones a la API. Las reglas de negocio y la validación definitiva de los permisos y los datos corresponden al backend.


