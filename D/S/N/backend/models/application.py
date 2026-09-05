from pydantic import BaseModel
from typing import Optional, List


class ScreeningAnswer(BaseModel):
    question: str
    answer: str


class ApplicationBase(BaseModel):
    user_id: str
    job_id: str
    company: str
    role: str
    location: str
    score: int
    status: str  # submitted, failed, pending


class ApplicationCreate(ApplicationBase):
    job_description: Optional[str] = None
    screening_answers: Optional[List[ScreeningAnswer]] = None
    screenshot_url: Optional[str] = None
    error_message: Optional[str] = None


class Application(ApplicationBase):
    id: str
    date: str
    job_description: Optional[str] = None
    screening_answers: Optional[List[ScreeningAnswer]] = None
    screenshot_url: Optional[str] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True
