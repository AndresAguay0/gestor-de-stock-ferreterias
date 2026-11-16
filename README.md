# SISTEMA DE GESTIÓN DE STOCK PARA FERRETERÍA

### Integrantes:
> - Aguayo Andrés
> - Maida Fabricio
> - Villalba Ailén

---

### Qué problema resuelve el proyecto:
En las ferreterías el control de stock manual suele complejizarse a medida que crece la variedad y/o cantidad de productos. 
Nuestro sistema de gestión de stock se encarga de mantener la coherencia y consistencia de datos de los productos dejandole al personal solo la tarea de, a través de una interfaz, facilitar la actualización de la información del stock.

---

### Tecnología elegida:
#### Backend y API:
- **Runtime:** *Node.js*
- **Framework:** *Express 5*
- **Lenguaje:** *TypeScript*
- **ORM:** *Sequelize 6*
- **Base de Datos:** *SQLite*
- **Validación:** *zod*
- **Migraciones:** *umzug*
- **Autenticación:** *JWT* (con *jose*) y contraseñas con *bcryptjs*

#### Frontend:
- **Librería UI:** *React*
- **Lenguaje:** *TypeScript*
- **Herramienta de Construcción:** *Vite*
- **Estilos:** *HTML y CSS*

---

### Cómo instalar el proyecto:
**Requerimientos previos:**
Tener instalado **Node v26** y **npm**

Clonar el repositorio.
```
git clone https://github.com/AndresAguay0/Metodologia-de-sistemas-2_Grupo-24.git
cd Metodologia-de-sistemas-2_Grupo-24
```

Correr estos comando:
```
cd server
npm install
cd ..
cd client
npm install
```

---

### Cómo ejecutar el proyecto:
#### Backend (server/)

1. Crear el archivo `.env` a partir de `.env.example`.
3. Correr el comando `npm run create-owner`. Aplica las migraciones y pide el email y la contraseña del primer dueño para crearlo.
3. Para levantar el servidor en desarrollo, correr el siguiente comando:
```
npm run dev
```

#### Frontend (client/)
```
npm run dev
```

---

### Estado actual y pendientes conocidos:
>**Backend casi terminado con sistemas principales del proyecto funcionales**
>- Sistema de reservas.
>- Sistema de notificaciones.
>- Mejoras para produccion:
>    - Seguridad
>    - Documentacion
>    - Posible migracion a PostgreSQL

>**Falta Front End completo**

---