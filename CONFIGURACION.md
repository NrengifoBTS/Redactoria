# Guía de Configuración de Variables de Entorno

Este proyecto utiliza variables de entorno para la configuración de URLs e IPs, lo que permite mayor flexibilidad y seguridad.

## Backend (FastAPI)

### Configuración Inicial

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Edita el archivo `.env` con tus valores:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@db:5432/cleanfastapi"

# LLM Configuration
LM_STUDIO_URL=http://localhost:1234

# CORS Origins (separados por comas)
CORS_ORIGINS=http://localhost:3000,http://192.168.1.36:3000

# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
```

### Variables Disponibles

- **DATABASE_URL**: URL de conexión a PostgreSQL
- **LM_STUDIO_URL**: URL del servidor LM Studio para IA
- **CORS_ORIGINS**: Lista de orígenes permitidos para CORS (separados por comas)
- **BACKEND_HOST**: Host donde correrá el backend
- **BACKEND_PORT**: Puerto del backend

## Frontend (React)

### Configuración Inicial

1. Ve a la carpeta del frontend:

   ```bash
   cd frontend/auth-app
   ```

2. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

3. Edita el archivo `.env` con tus valores:

```bash
# API Backend URL
REACT_APP_API_URL=http://192.168.1.36:8000

# ComfyUI URL
REACT_APP_COMFYUI_URL=http://127.0.0.1:8188
```

### Variables Disponibles

- **REACT_APP_API_URL**: URL del backend FastAPI
- **REACT_APP_COMFYUI_URL**: URL de ComfyUI para generación de imágenes

## Docker

El archivo `docker-compose.yml` está configurado para leer las variables del archivo `.env` automáticamente.

### Ejecutar con Docker

```bash
# Levantar los contenedores
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener contenedores
docker-compose down
```

### Cambiar Puerto del Backend

Si necesitas cambiar el puerto del backend, edita en `.env`:

```bash
BACKEND_PORT=8001
```

Y actualiza `REACT_APP_API_URL` en el frontend:

```bash
REACT_APP_API_URL=http://192.168.1.36:8001
```

## Configuración de Red

### Para desarrollo local:

```bash
REACT_APP_API_URL=http://localhost:8000
```

### Para red local:

```bash
REACT_APP_API_URL=http://192.168.1.36:8000
```

### Para producción:

```bash
REACT_APP_API_URL=https://tu-dominio.com
```

## Notas Importantes

1. **Nunca** commitees los archivos `.env` al repositorio
2. Los archivos `.env.example` sirven como plantilla
3. Cada desarrollador debe tener su propio `.env` con sus IPs locales
4. Reinicia el servidor después de cambiar variables de entorno
5. En React, las variables deben empezar con `REACT_APP_`

## Troubleshooting

### El frontend no puede conectarse al backend

1. Verifica que `REACT_APP_API_URL` tenga la IP correcta
2. Asegúrate de que el backend esté corriendo
3. Verifica que la IP esté en `CORS_ORIGINS` del backend
4. Reinicia ambos servidores después de cambiar `.env`

### Docker no toma las variables

1. Verifica que el archivo `.env` esté en la raíz del proyecto
2. Reconstruye los contenedores: `docker-compose up --build`
3. Verifica las variables con: `docker-compose config`
