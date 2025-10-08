from typing import List, Dict, Optional
from pydantic import BaseModel, ConfigDict
from  datetime import datetime
from uuid import UUID


class EstadoBlog(str):
    DRAFT ="draft"
    GENERATED = "generated"
    REVIEW = "review"
    APPROVED = "approved"
    PUBLISHED = "published"


# BASE 
class BlogBase(BaseModel):
    query: str
    titulo_principal: Optional[str] = None
    keywords: Optional[List[str]] = None
    estructura: Optional[Dict[str, List[str]]] = None
    conclusion: Optional[str] = None
    estado: str = EstadoBlog.DRAFT


# CREATE 
class BlogCreate(BlogBase):
    pass


#UPDATE 
class BlogUpdate(BaseModel):
    titulo_principal: Optional[str] = None
    keywords : Optional[str] = None
    estructura: Optional[Dict[str, List[str]]] = None
    conslusion: Optional[str] = None 
    estado: Optional[str] = None 

class BlogResponse(BlogBase): 
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None 

    model_config =ConfigDict(from_attributes=True) 
