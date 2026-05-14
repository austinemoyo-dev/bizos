from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from core.config import settings
from core.dependencies import get_current_user, get_db, role_required
from core.limiter import limiter
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from models.user import User, UserRole
from schemas.auth import (
    AccessTokenResponse,
    PasswordChangeRequest,
    RefreshRequest,
    TokenResponse,
    UserAdminUpdate,
    UserLogin,
    UserOut,
    UserRegister,
    UserUpdate,
)

router = APIRouter()

_REFRESH_COOKIE = "refresh_token"
_REFRESH_PATH   = "/api/v1/auth/refresh"


def _set_refresh_cookie(response: Response, token: str) -> None:
    is_prod = settings.ENV == "production"
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=is_prod,
        # cross-domain free hosting (Vercel + Fly.io) requires samesite=none + secure=true
        samesite="none" if is_prod else "lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path=_REFRESH_PATH,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.super_admin)),
):
    if db.query(User).filter_by(email=payload.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,  # noqa: ARG001 — required by slowapi
    payload: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter_by(email=payload.email, is_active=True).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    access_token  = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    # Long-lived token stored in HttpOnly cookie — not accessible to JavaScript
    _set_refresh_cookie(response, refresh_token)
    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,   # also in body for native/API clients
        "token_type":    "bearer",
        "user":          user,
    }


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(
    payload: RefreshRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    # Accept from HttpOnly cookie (browser) OR request body (API/mobile clients)
    token = request.cookies.get(_REFRESH_COOKIE) or payload.refresh_token
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token required")
    data = decode_token(token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    user = db.query(User).filter_by(id=data["sub"], is_active=True).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    # Rotate: old token is replaced, new cookie issued
    new_refresh = create_refresh_token({"sub": str(user.id)})
    _set_refresh_cookie(response, new_refresh)
    return AccessTokenResponse(access_token=create_access_token({"sub": str(user.id)}))


@router.post("/logout")
def logout(response: Response):
    is_prod = settings.ENV == "production"
    response.delete_cookie(
        key=_REFRESH_COOKIE,
        path=_REFRESH_PATH,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        httponly=True,
    )
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name:
        current_user.name = payload.name
    if payload.email:
        if db.query(User).filter(User.email == payload.email, User.id != current_user.id).first():
            raise HTTPException(400, "Email already in use")
        current_user.email = payload.email
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password", status_code=200)
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(role_required(UserRole.owner)),
):
    return db.query(User).order_by(User.created_at).all()


@router.patch("/users/{user_id}", response_model=UserOut)
def admin_update_user(
    user_id: str,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.super_admin)),
):
    if str(current_user.id) == user_id:
        raise HTTPException(400, "Cannot modify your own account via this endpoint")
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user
