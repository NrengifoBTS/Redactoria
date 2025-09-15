from fastapi import HTTPException

class ContentError(HTTPException):
    """Base exception for content-related errors"""
    pass

class ContentNotFoundError(ContentError):
    def __init__(self, content_id = None):
        message = "Content not found" if content_id is None else f"Content with id {content_id} not found"
        super().__init__(status_code=404, detail=message)

class ContentCreationError(ContentError):
    def __init__(self, error: str):
        super().__init__(status_code=500, detail=f"Failed to create content: {error}")

class ContentGenerationError(ContentError):
    def __init__(self, content_type: str, error: str):
        super().__init__(status_code=500, detail=f"Failed to generate {content_type} content: {error}")

class ContentUpdateError(ContentError):
    def __init__(self, error: str,content_id= None):
        super().__init__(status_code=500, detail=f"Failed to update content {content_id}: {error}")

class TodoError(HTTPException):
    """Base exception for todo-related errors"""
    pass

class TodoNotFoundError(TodoError):
    def __init__(self, todo_id=None):
        message = "Todo not found" if todo_id is None else f"Todo with id {todo_id} not found"
        super().__init__(status_code=404, detail=message)

class TodoCreationError(TodoError):
    def __init__(self, error: str):
        super().__init__(status_code=500, detail=f"Failed to create todo: {error}")

class UserError(HTTPException):
    """Base exception for user-related errors"""
    pass

class UserNotFoundError(UserError):
    def __init__(self, user_id=None):
        message = "User not found" if user_id is None else f"User with id {user_id} not found"
        super().__init__(status_code=404, detail=message)

class PasswordMismatchError(UserError):
    def __init__(self):
        super().__init__(status_code=400, detail="New passwords do not match")

class InvalidPasswordError(UserError):
    def __init__(self):
        super().__init__(status_code=401, detail="Current password is incorrect")

class AuthenticationError(HTTPException):
    def __init__(self, message: str = "Could not validate user"):
        super().__init__(status_code=401, detail=message)

class ProyectoCreationError(HTTPException):
    def __init__(self, error: str):
        super().__init__(status_code=500, detail=f"Failed to create proyecto: {error}")

class ProyectoNotFoundError(HTTPException):
    def __init__(self, proyecto_id=None):
        message = "Proyecto not found" if proyecto_id is None else f"Proyecto with id {proyecto_id} not found"
        super().__init__(status_code=404, detail=message)
       
class TemplateCreationError(HTTPException):
    def __init__(self, error: str):
        super().__init__(status_code=500, detail=f"Failed to create template: {error}")

class TemplateNotFoundError(HTTPException):
    def __init__(self, template_id=None):
        message = "Template not found" if template_id is None else f"Template with id {template_id} not found"
        super().__init__(status_code=404, detail=message)
        
class LandingPageCreationError(HTTPException):
    def __init__(self, error: str):
        super().__init__(status_code=500, detail=f"Failed to create landing page: {error}")

class LandingPageNotFoundError(HTTPException):
    def __init__(self, landing_page_id=None):
        message = "Landing page not found" if landing_page_id is None else f"Landing page with id {landing_page_id} not found"
        super().__init__(status_code=404, detail=message)
        
class SeccionLPCreationError(HTTPException):
    def __init__(self, error: str):
        super().__init__(status_code=500, detail=f"Failed to create seccion: {error}")

class SeccionLPNotFoundError(HTTPException):
    def __init__(self, seccion_id=None):
        message = "Seccion not found" if seccion_id is None else f"Seccion with id {seccion_id} not found"
        super().__init__(status_code=404, detail=message)
        
class AnotacionCreationError(HTTPException):
    def __init__(self, error: str):
        super().__init__(status_code=500, detail=f"Failed to create anotacion: {error}")

class AnotacionNotFoundError(HTTPException):
    def __init__(self, anotacion_id=None):
        message = "Anotacion not found" if anotacion_id is None else f"Anotacion with id {anotacion_id} not found"
        super().__init__(status_code=404, detail=message)