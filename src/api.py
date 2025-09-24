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
from src.ia.controller import router as ia_router
from fastapi.middleware.cors import CORSMiddleware

def register_routes(app: FastAPI):
    origins = [
        "http://localhost:3000",        
        "http://192.168.1.129:3000",
        "http://192.168.1.129:3000",
        "http://192.168.1.129:8000",
        "http://192.168.1.129:8000",
        "http://192.168.1.129:1234",
        "http://192.168.1.129:1234",
        "http://200.91.205.82:8000",
        "http://200.91.205.82:3000",
    ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
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