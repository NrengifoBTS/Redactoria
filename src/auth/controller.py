from typing import Annotated
from fastapi import APIRouter, Depends, Request, HTTPException
from starlette import status
from . import  models
from . import service
from fastapi.security import OAuth2PasswordRequestForm
from ..database.core import DbSession
from ..rate_limiter import limiter
from ..exceptions import AuthenticationError
from .service import verify_token

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)


@router.post("/", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register_user(request: Request, db: DbSession,
                      register_user_request: models.RegisterUserRequest):
    service.register_user(db, register_user_request)


@router.post("/token", response_model=models.Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                                 db: DbSession):
    return service.login_for_access_token(form_data, db)

@router.get("/verify-token/{token}")
async def verify_token_route(token: str):
    try:
        verify_token(token)
        token_data = verify_token(token)
        return {"message": "Token is valid", "id": token_data.user_id}
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid token")






