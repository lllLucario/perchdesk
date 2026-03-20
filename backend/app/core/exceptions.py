class PerchDeskError(Exception):
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, detail: str = "An internal error occurred.") -> None:
        self.detail = detail
        super().__init__(detail)


class BookingConflictError(PerchDeskError):
    status_code = 409
    error_code = "BOOKING_CONFLICT"

    def __init__(self, detail: str = "This seat is already booked for the selected time.") -> None:
        super().__init__(detail)


class BookingRuleViolationError(PerchDeskError):
    status_code = 400
    error_code = "RULE_VIOLATION"

    def __init__(self, detail: str = "Booking violates space rules.") -> None:
        super().__init__(detail)


class SeatUnavailableError(PerchDeskError):
    status_code = 400
    error_code = "SEAT_UNAVAILABLE"

    def __init__(self, detail: str = "Seat is not available.") -> None:
        super().__init__(detail)


class UnauthorizedError(PerchDeskError):
    status_code = 401
    error_code = "UNAUTHORIZED"

    def __init__(self, detail: str = "Authentication required.") -> None:
        super().__init__(detail)


class ForbiddenError(PerchDeskError):
    status_code = 403
    error_code = "FORBIDDEN"

    def __init__(self, detail: str = "You do not have permission to perform this action.") -> None:
        super().__init__(detail)


class NotFoundError(PerchDeskError):
    status_code = 404
    error_code = "NOT_FOUND"

    def __init__(self, detail: str = "Resource not found.") -> None:
        super().__init__(detail)


class DuplicateError(PerchDeskError):
    status_code = 409
    error_code = "DUPLICATE"

    def __init__(self, detail: str = "Resource already exists.") -> None:
        super().__init__(detail)
