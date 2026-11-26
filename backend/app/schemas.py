from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_validator

NonEmpty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class SendCodeRequest(BaseModel):
    phone: NonEmpty


class RegisterRequest(BaseModel):
    phone: NonEmpty
    code: NonEmpty
    nickname: NonEmpty = Field(max_length=40)
    school_company: str | None = Field(default=None, max_length=120)
    skills: str | None = Field(default=None, max_length=300)
    desired_role: str | None = Field(default=None, max_length=80)
    bio: str | None = Field(default=None, max_length=600)

    @field_validator("school_company", "skills", "desired_role", "bio", mode="before")
    @classmethod
    def blank_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class LoginRequest(BaseModel):
    phone: NonEmpty
    code: NonEmpty


class RoleCreate(BaseModel):
    name: NonEmpty = Field(max_length=60)
    planned_count: int = Field(ge=1, le=99)
    requirements: str = Field(default="", max_length=1000)

    @field_validator("requirements", mode="before")
    @classmethod
    def clean_requirements(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class TeamCreateRequest(BaseModel):
    name: NonEmpty = Field(max_length=80)
    tagline: NonEmpty = Field(max_length=160)
    description: NonEmpty = Field(max_length=5000)
    track: str | None = Field(default=None, max_length=80)
    capacity: int = Field(ge=1, le=99)
    roles: list[RoleCreate] = Field(min_length=1, max_length=10)
    hard_requirements: str | None = Field(default=None, max_length=2000)
    bonus_preferences: str | None = Field(default=None, max_length=2000)

    @field_validator("track", "hard_requirements", "bonus_preferences", mode="before")
    @classmethod
    def empty_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("roles")
    @classmethod
    def unique_role_names(cls, roles: list[RoleCreate]) -> list[RoleCreate]:
        names = [role.name.casefold() for role in roles]
        if len(names) != len(set(names)):
            raise ValueError("招募角色名称不能重复")
        return roles


class ApplicationCreateRequest(BaseModel):
    role_id: int = Field(gt=0)
    message: NonEmpty = Field(max_length=1000)


class RejectApplicationRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)

    @field_validator("reason", mode="before")
    @classmethod
    def blank_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value
