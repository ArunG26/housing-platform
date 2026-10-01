from __future__ import annotations

from hmac import compare_digest
from typing import Annotated, Callable

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import ESTIMATOR_ML_TOKEN, MARKET_ML_TOKEN
from app.observability import set_principal

bearer = HTTPBearer(auto_error=False)

_IDENTITIES = {
    "estimator-service": {"token": ESTIMATOR_ML_TOKEN, "scopes": {"ml:predict", "ml:model-read"}},
    "market-service": {"token": MARKET_ML_TOKEN, "scopes": {"ml:predict"}},
}


def require_scope(scope: str) -> Callable:
    async def dependency(
        credentials: Annotated[HTTPAuthorizationCredentials | None, Security(bearer)],
    ) -> str:
        supplied = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else ""
        identity = None
        for name, config in _IDENTITIES.items():
            if supplied and compare_digest(supplied, str(config["token"])):
                identity = name
                if scope not in config["scopes"]:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Missing required scope: {scope}")
                break
        if identity is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid service credential")
        set_principal(identity)
        return identity

    return dependency
