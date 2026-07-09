"""Pydantic request/response models for the StackPilot API."""

from pydantic import BaseModel, Field


class MasterclassRequest(BaseModel):
    framework: str = Field(min_length=1, description="Framework key: nextjs | fastapi | neon")
    mode: str = Field(default="deep-dive", description="deep-dive | code-first")
    query: str = Field(min_length=1, description="The user's learning goal")


class SourceDoc(BaseModel):
    id: int
    section_title: str
    doc_url: str
    raw_content: str
