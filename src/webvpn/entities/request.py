
from pydantic import Field
from pydantic.dataclasses import dataclass


@dataclass
class CheckCodeRequest:
    code: int = Field(..., ge=100000, le=999999, description="6-значный код")