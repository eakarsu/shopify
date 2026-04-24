import { NextResponse } from "next/server"

export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = "ApiError"
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = "Bad request") {
    super(message, 400)
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(message, 401)
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(message, 403)
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Not found") {
    super(message, 404)
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = "Too many requests") {
    super(message, 429)
  }
}

export class ValidationError extends ApiError {
  errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>) {
    super("Validation failed", 422)
    this.errors = errors
  }
}

export function handleApiError(error: unknown) {
  console.error("API Error:", error)

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, errors: error.errors },
      { status: error.statusCode }
    )
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  )
}

export function withErrorHandler(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
