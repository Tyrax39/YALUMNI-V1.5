from fastapi import HTTPException, status


class PermissionDenied(HTTPException):
    def __init__(self, detail: str = "Permission denied") -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

