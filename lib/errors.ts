export class AppError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "กรุณาเข้าสู่ระบบก่อน") {
    super(message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "ไม่มีสิทธิ์เข้าถึง") {
    super(message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "ข้อมูล") {
    super(`ไม่พบ${resource}`, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}
