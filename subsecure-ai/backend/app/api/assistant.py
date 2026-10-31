from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas.ai_query import AssistantQueryRequest, AssistantQueryResponse
from ..security.dependencies import get_current_user
from ..services import ai_service

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/query", response_model=AssistantQueryResponse)
def query(
    payload: AssistantQueryRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Secure read-only finance copilot. The model output is validated against a
    strict whitelist and can never trigger SQL execution or financial writes."""
    try:
        return ai_service.answer_question(db, payload.question, user)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
