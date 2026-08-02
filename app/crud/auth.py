from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.auth import UserRegister, UserLogin
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token
from app.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def create_user(db: Session, user_data: UserRegister) -> User:
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # The first account may bootstrap the system as an administrator. Later
    # registrations are vendor accounts; administrators provision elevated access.
    is_first_user = db.query(User).count() == 0
    if user_data.role == "ADMIN" and not is_first_user:
        raise HTTPException(status_code=403, detail="Administrator accounts must be provisioned by an administrator")
    if user_data.role == "VENDOR" and not user_data.vendor_id:
        raise HTTPException(status_code=422, detail="Vendor registrations require a vendor_id")
    if user_data.role == "VENDOR" and not db.query(Vendor).filter(Vendor.id == user_data.vendor_id).first():
        raise HTTPException(status_code=422, detail="The selected vendor_id does not exist")

    hashed_pwd = hash_password(user_data.password)
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        full_name=user_data.full_name,
        role=user_data.role,
        vendor_id=user_data.vendor_id,
        approval_status="PENDING" if user_data.role == "VENDOR" else "APPROVED",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, login_data: UserLogin) -> dict:
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "vendor_id": user.vendor_id
    }
    access_token = create_access_token(token_data)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "vendor_id": user.vendor_id
    }

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Bearer token missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required role: {', '.join(allowed_roles)}. Your role: {current_user.role}"
            )
        if current_user.role == "VENDOR" and current_user.approval_status != "APPROVED":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your vendor account is awaiting administrator approval")
        return current_user
    return role_checker

def get_pending_vendor_users(db: Session) -> list[User]:
    return db.query(User).filter(User.role == "VENDOR", User.approval_status == "PENDING").order_by(User.created_at.asc()).all()

def set_vendor_approval(db: Session, user_id: int, approval_status: str) -> User | None:
    user = db.query(User).filter(User.id == user_id, User.role == "VENDOR").first()
    if not user:
        return None
    user.approval_status = approval_status
    db.commit()
    db.refresh(user)
    return user
