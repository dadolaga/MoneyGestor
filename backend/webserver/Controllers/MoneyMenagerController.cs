using Microsoft.AspNetCore.Mvc;
using Serilog;

namespace webserver.Controllers {
    public class MoneyMenagerController : ControllerBase {
        protected IActionResult CreateResponse(UInt64 id, String objectName = "") => OkReponse(id, objectName);

        protected IActionResult ErrorResponse(UInt32 code, String message) => Response(code, message, statusCode: 400);

        private IActionResult OkReponse(Object? data = null, String message = "") => Response(0, message, data);

        private IActionResult Response(UInt32 code, String? message = "", Object? data = null, UInt16 statusCode = 200) {
            Log.Debug($"Reponse ({statusCode}) with: {{Code: {code}, Message: \"{message}\", Data: {data}}}");

            return StatusCode(statusCode, new BaseResponse {
                Code = code,
                Message = message,
                Data = data
            });
        }
    }

    public class BaseResponse {
        public UInt32 Code { get; set; }
        public String? Message { get; set; }
        public Object? Data { get; set; }
    }
}