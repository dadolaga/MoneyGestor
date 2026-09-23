using logic.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using webserver.Controllers;

namespace webserver {
    public class MoneyGestorExceptionHandler : IExceptionHandler {
        public async ValueTask<Boolean> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken) {
            BaseResponse response;

            if (exception is TokenExpiatedException) {
                response = new BaseResponse {
                    Code = 20,
                    Message = "User token expiated"
                };
                httpContext.Response.StatusCode = StatusCodes.Status403Forbidden;
            } else if (exception is ObjectNotFoundException or UserNotHavePermissionExcpetion) {
                response = new BaseResponse {
                    Code = 404,
                    Message = "Resource not found"
                };
                httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            } else {
                return false;
            }

            await httpContext.Response.WriteAsJsonAsync(response, cancellationToken);

            return true;
        }
    }
}
