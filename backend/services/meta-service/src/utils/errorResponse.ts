type ErrorResponse = {
  errorCode: string;
  message: string;
  extra?: any;
};


const IS_DEV = process.env.IS_DEVELOPMENT || true; 
export function errorResponse(code: string, message: string, extra: any = null): ErrorResponse {
  const error: ErrorResponse = { errorCode: code, message };

  if (IS_DEV && extra !== null) {
    error.extra = extra;
  }

  return error;
}
