from __future__ import annotations

from hmac import compare_digest
from typing import Annotated

from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.observability import set_principal

bearer = HTTPBearer(auto_error=False)
VALID_ROLES = {"VIEWER", "ANALYST"}

async def require_bff(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(bearer)],
    x_user_role: Annotated[str | None, Header()] = None,
) -> str:
    supplied = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else ""
    if not supplied or not compare_digest(supplied, settings.bff_internal_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal service credential")
    
    if x_user_role is None or not x_user_role.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="X-User-Role header is required"
        )

    normalized_role = x_user_role.strip().upper()
    
    if normalized_role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role"
        )
   
    set_principal(normalized_role)
    return normalized_role
