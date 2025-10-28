export class AppError extends Error {
  code?: string;
  status?: number;
  cause?: unknown;

  constructor(message: string, opts?: { code?: string; status?: number; cause?: unknown }) {
    super(message);
    this.name = 'AppError';
    if (opts) {
      this.code = opts.code;
      this.status = opts.status;
      this.cause = opts.cause;
    }
  }

  static from(error: unknown, fallbackMessage = '发生未知错误') {
    if (error instanceof AppError) return error;
    const anyErr: any = error as any;
    const status = anyErr?.status ?? anyErr?.response?.status;
    const message = anyErr?.message ?? fallbackMessage;
    return new AppError(message, { status, cause: error });
  }
}

export function ensureAppError(error: unknown, fallbackMessage?: string) {
  return AppError.from(error, fallbackMessage);
}
