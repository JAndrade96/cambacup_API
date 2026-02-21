# cambacup_db — Documentación Técnica

 **Motor:** PostgreSQL 18.1 | **Esquema:** public | **Extensión:** pgcrypto

---

## Resumen General

`cambacup_db` es la base de datos de la plataforma **Camba Cup**, diseñada para gestionar torneos/copas deportivas. Su arquitectura actual cubre el módulo de autenticación y gestión de usuarios con roles, planes de suscripción, invitaciones y colaboradores.

Todas las tablas usan **UUID** como clave primaria, generados automáticamente con `gen_random_uuid()` de la extensión `pgcrypto`.

---

## Tipos ENUM

### `user_role`
| Valor | Descripción |
|-------|-------------|
| `ADMIN` | Acceso total al sistema |
| `ORGANIZER` | Rol predeterminado; puede crear torneos e invitar colaboradores |
| `COLLABORATOR` | Acceso limitado según permisos asignados por el organizador |

### `subscription_plan`
| Valor | Descripción |
|-------|-------------|
| `BASIC` | Plan gratuito (predeterminado) |
| `STANDARD` | Plan intermedio con funcionalidades ampliadas |
| `PREMIUM` | Plan completo con todas las funcionalidades |

---

##  Tablas

### `users`
Tabla central del sistema. Almacena todos los usuarios registrados.

| Columna | Tipo | Default | Restricciones | Nullable | Descripción |
|---------|------|---------|---------------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | PK | NO | Identificador único |
| `email` | `varchar(255)` | — | UNIQUE, NOT NULL | NO | Correo electrónico |
| `password_hash` | `varchar(255)` | — | NOT NULL | NO | Hash de la contraseña |
| `full_name` | `varchar(150)` | — | — | SÍ | Nombre completo |
| `phone` | `varchar(20)` | — | — | SÍ | Teléfono |
| `role` | `user_role` | `'ORGANIZER'` | — | SÍ | Rol del usuario |
| `plan` | `subscription_plan` | `'BASIC'` | — | SÍ | Plan de suscripción |
| `plan_expires_at` | `timestamp` | — | — | SÍ | Vencimiento del plan |
| `create_at` | `timestamp` | `CURRENT_TIMESTAMP` | — | SÍ | Fecha de creación |
| `update_at` | `timestamp` | `CURRENT_TIMESTAMP` | — | SÍ | Última actualización |

---

### `invitations`
Gestiona las invitaciones que un organizador envía para sumar colaboradores.

| Columna | Tipo | Default | Restricciones | Nullable | Descripción |
|---------|------|---------|---------------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | PK | NO | Identificador único |
| `organizer_id` | `uuid` | — | FK → `users.id` | NO | Organizador que invita |
| `token` | `varchar(50)` | — | UNIQUE, NOT NULL | NO | Token de invitación |
| `status` | `varchar(20)` | `'PENDING'` | — | SÍ | Estado de la invitación |
| `created_at` | `timestamp` | `CURRENT_TIMESTAMP` | — | SÍ | Fecha de creación |

---

### `collaborators`
Registra las relaciones de colaboración y sus permisos entre usuarios.

| Columna | Tipo | Default | Restricciones | Nullable | Descripción |
|---------|------|---------|---------------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | PK | NO | Identificador único |
| `organizer_id` | `uuid` | — | FK → `users.id` | NO | Organizador dueño |
| `collaborator_id` | `uuid` | — | FK → `users.id` | NO | Usuario colaborador |
| `can_edit_results` | `boolean` | `true` | — | SÍ | Permiso para editar resultados |
| `can_manage_teams` | `boolean` | `false` | — | SÍ | Permiso para gestionar equipos |
| `create_at` | `timestamp` | `CURRENT_TIMESTAMP` | — | SÍ | Fecha de registro |

La combinación `(organizer_id, collaborator_id)` tiene restricción **UNIQUE** para evitar duplicados.

---

## Claves Foráneas

Todas las FK usan `ON DELETE CASCADE`: al eliminar un usuario, se eliminan automáticamente sus invitaciones y colaboraciones.

| Tabla origen | Columna | Referencia | On Delete |
|--------------|---------|------------|-----------|
| `collaborators` | `organizer_id` | `users.id` | CASCADE |
| `collaborators` | `collaborator_id` | `users.id` | CASCADE |
| `invitations` | `organizer_id` | `users.id` | CASCADE |

---

## Índices

| Nombre | Tabla | Columna | Tipo |
|--------|-------|---------|------|
| `idx_users_email` | `users` | `email` | btree |

---

## Extensiones

| Extensión | Esquema | Uso |
|-----------|---------|-----|
| `pgcrypto` | `public` | Provee `gen_random_uuid()` para generar UUIDs v4 |

---