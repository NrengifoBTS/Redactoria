from fastapi import FastAPI
from sqlalchemy import text
from .database.core import engine, Base
from .entities.todo import Todo
from .entities.user import User
from .entities.proyecto import Proyecto
from .entities.template import Template
from .entities.landing_page import LandingPage
from .entities.seccion_lp import SeccionLP
from .entities.anotacion import Anotacion

from .api import register_routes
from .logging import configure_logging, LogLevels

# Cargar variables de entorno desde .env
from dotenv import load_dotenv
load_dotenv()

configure_logging(LogLevels.info)
app = FastAPI()

# Drop all tables with CASCADE
'''with engine.connect() as conn:
    result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'  AND tablename NOT LIKE 'pg_%'"))
    tables = [row[0] for row in result]
    
    for table in tables:
        conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
    conn.commit()'''

# Create all tables
Base.metadata.create_all(bind=engine)

register_routes(app)