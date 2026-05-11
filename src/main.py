from fastapi import FastAPI
from sqlalchemy import text
from .database.core import engine, Base

# Import existing entities
from .entities.todo import Todo
from .entities.user import User
from .entities.proyecto import Proyecto
from .entities.template import Template
from .entities.landing_page import LandingPage
from .entities.seccion_lp import SeccionLP
from .entities.anotacion import Anotacion
from .entities.blog import Blog
from .entities.scraping import Scraping

# Import new logging entities
from .entities.logging.ai_generation import AIGeneration
from .entities.logging.user_edit import UserEdit
from .entities.logging.user_style_profile import UserStyleProfile
from .entities.logging.training_dataset import TrainingDataset
from .entities.logging.narrative_flow import NarrativeFlow
from .entities.logging.translation_quality import TranslationQuality

from .api import register_routes
from .logging_custom import configure_logging, LogLevels

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

# IMPORTANT: Use Alembic for database migrations instead of create_all()
# Run: docker-compose exec api alembic upgrade head
# Base.metadata.create_all(bind=engine)  # Commented out - use Alembic migrations

register_routes(app)