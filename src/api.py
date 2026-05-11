from fastapi import FastAPI
from src.todos.controller import router as todos_router
from src.auth.controller import router as auth_router
from src.users.controller import router as users_router
from src.proyectos.controller import router as proyectos_router
from src.templates.controller import router as templates_router
from src.landing_pages.controller import router as landing_pages_router
from src.secciones_lp.controller import router as secciones_lp_router
from src.anotaciones.controller import router as anotaciones_router
from src.export_excel.controller import router as export_router
from src.blog_logs.controller import router as logs_blog_router
from src.ia.controller import router as ia_router
from src.blog.controller import router as blog_router
from src.logging_service.controller import router as logging_router  # NEW


from src.scraping.controllers import router as scraping_router_stream, router_ai

from fastapi.middleware.cors import CORSMiddleware
import os

def register_routes(app: FastAPI):
    origins = [
        "http://localhost:3001", 
        "http://192.168.1.129:3001",
        "http://192.168.1.129:8080",
        "http://192.168.1.129:1234",
        "http://192.168.1.36:8080",
        "http://192.168.1.36:8080",
        "http://192.168.1.36:1234",
        "http://172.18.16.1:1234",



    ]
    
    # Leer CORS origins desde variable de entorno
    cors_origins_env = os.getenv('CORS_ORIGINS', 'http://localhost:3001')
    origins = [origin.strip() for origin in cors_origins_env.split(',')]

    # Log para verificar configuración
    print(f"🔧 CORS_ORIGINS configurado desde .env: {cors_origins_env}")
    print(f"🌐 Orígenes CORS permitidos: {origins}")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Rutas después del middleware
    app.include_router(todos_router)
    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(proyectos_router)
    app.include_router(templates_router)
    app.include_router(landing_pages_router)
    app.include_router(secciones_lp_router)
    app.include_router(anotaciones_router)
    app.include_router(ia_router)
    app.include_router(export_router)
    app.include_router(blog_router)
    app.include_router(logs_blog_router)
    app.include_router(logging_router)  # NEW - Logging & Analytics

    # Rutas de Scraping y la Nueva Ruta de AI
    app.include_router(scraping_router_stream) # Incluye el router original /scraping/stream
    app.include_router(router_ai)             # Incluye el nuevo router /ai/generate_structure
    
