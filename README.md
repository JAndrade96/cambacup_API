# Documentación del Backend - CambaCup API
# Versión: 1.0

Tecnología: Node.js + Express + PostgreSQL

URL BASE(Local): http://localhost:3000/api

1. Autenticación y Seguridad

La API utiliza JWT (JSON Web Tokens).
  . Rutas Públicas: No requiren llave (ej. Login, Registro).
  . Rutas Privadas: Requieren enviar el token en la cabecera (Header) de la petición.

Formato del Header

HTTP
Authorization: Bearer <TU_TOKEN_AQUI>
(Nota: Debe haber un espacio entre la palabra Bearer y el token)

Módulo 1: Autenticación (Auth)
Ruta Base: /auth

1.1 Registrar Organizador
Crea un nuevo usuario. Por defecto, se le asigna el rol ORGANIZER y el plan BASIC.
  . Método: POST
  . Endpoint: /auth/register
  . Body (JSON):

    {
      "email": "juan@cambacup.com",
      "password": "pass_seguro_123",
      "full_name": "Juan Andrade",
      "phone": "70012345" 
    }

  . Respuesta Exitosa (201 Created):

    {
      "mensaje": "Usuario registrado con éxito",
      "token": "eyJhbGciOiJIUz...",
      "user": {
        "id": "a1b2-c3d4...",
        "email": "juan@cambacup.com",
        "role": "ORGANIZER",
        "plan": "BASIC"
      }
    }
  
  . Errores Comunes:
    . 400> El correo ya está registrado.

1.2 Iniciar Sesión (Login)

Genera el token de acceso para un usario existente.

  . Método: POST
  . Endpoint: /auth/login
  . Body (JSON)

    {
      "email": "juan@cambacup.com",
      "password": "pass_seguro_123"
    }

  . Respuesta Exitosa (200 OK):

    {
      "mensaje": "Login exitoso",
      "token": "eyJhbGciOiJIUz...",
      "user": { ... }
    }

  . Errores Comunes:

    . 400: Credenciales inválidas (contraseña incorrecta o usuario no existe).

1.3 Ver Perfil (Prueba de Token)

Devuelve los datos del usuario logueado. Útil para verificar si el token es válido

  . Método: GET
  . Endpoint: /auth/profile
  . Header Requerido: Authorization: Bearer <TOKEN>
  . Respuesta Exitosa (200 OK):

    {
      "mensaje": "¡Bienvenido a tu zona privada!",
      "datos_usuario": {
        "id": "...",
        "role": "ORGANIZER",
        "iat": 17000000,
        "exp": 17000000
      }
    }

Modulo 2: Colaboradores e Invitaciones
Ruta Base: /invites

2.1 Crear Invitación (Solo Organizador/Admin)

Genera un enlace único para invitar a alguien a ser colaborador.

  . Método: POST
  . Endpoint: /invites/create
  . Header Requerido: Authotization: Bearer <TOKEN_DEL_JEFE>
  . Body: (Vacío)
  . Respuesta Exitosa (200 OK):

    {
      "mensaje": "Invitación creada",
      "codigo": "94027cae",
      "link_whatsapp": "https://camba.app/join?code=94027cae"
    }

2.2 Aceptar Invitación (Canjear Código)

Vincula al usuario actual con el organizador que el creó el código. Efecto secundario: Cambia el rol del usuario a COLLABORATOR inmediatamente

  . Método: POST
  . EndPoint: /invites/accept
  . Header Requerido: Authotization: Bearer <TOKEN_DEL_AYUDANTE>
  . Body (JSON):

    {
      "token": "94027cae"
    }

  . Respuesta Exitosa (200 OK):

    {
      "mensaje": "¡Ahora eres colaborador! Tu rol ha sido actualizado.",
      "jefe_id": "id-del-organizador-uuid"
    }

  . Errores Comunes:

    . 404: Invitación no existe o ya fue usuada.
    . 400: No puedes ser colaborador de ti mismo.
    . 400: Ya eres colaborador de este usuario.

Códigos de Estado HTTP (Referencia)

Código   Significado      ¿Qué hacer?

200      OK               Todo salió bien.

201      Created          Se creó un registo nuevo (ej. usuario registrado).

400      Bad Request      Enviaste datos mal (ej. falta email, código incorrecto).

401      Unauthorized     No tienes el token o expiró. Haz login de nuevo.

403      Forbidden        Tiens toke, pero tu rol no tiene permisos para entrar aquí.

500      Server Error     Error nuestro (del código o la base de datos).