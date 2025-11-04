from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from ..database.core import Base 

class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)

    created_projects = relationship("Proyecto", foreign_keys="Proyecto.created_by", back_populates="creator")
    assigned_projects = relationship("Proyecto", foreign_keys="Proyecto.assigned_to", back_populates="assignee")
    created_templates = relationship("Template", back_populates="creator")
    anotaciones = relationship("Anotacion", back_populates="user")  

    def __repr__(self):
        return f"<User(email='{self.email}', first_name='{self.first_name}', last_name='{self.last_name}')>"