from pydantic import BaseModel
from typing import Optional


class JobBase(BaseModel):
    company: str
    title: str
    location: str
    url: str
    description: Optional[str] = None
    salary: Optional[str] = None
    job_type: Optional[str] = None


class JobCreate(JobBase):
    relevance_score: Optional[int] = None


class Job(JobBase):
    id: str
    relevance_score: int
    created_at: str

    class Config:
        from_attributes = True
