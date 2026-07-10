"""Pydantic request/response models for the StackPilot API."""

from pydantic import BaseModel, Field


class MasterclassRequest(BaseModel):
    framework: str = Field(
        min_length=1,
        description=(
            "Stack key: nextjs | fastapi | neon | react-vite | express | django "
            "| fastapi-vite | nextjs-fullstack"
        ),
    )
    mode: str = Field(default="deep-dive", description="deep-dive | code-first | comparison")
    query: str = Field(min_length=1, description="The user's learning goal")
    compare_to: str | None = Field(
        default=None,
        description="Second stack key for comparison mode; the query then only needs the use case",
    )


class SourceDoc(BaseModel):
    id: int
    framework_name: str = ""
    section_title: str
    doc_url: str
    raw_content: str
