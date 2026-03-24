using Microsoft.AspNetCore.Mvc;
using Serilog;
using webserver.Models;

namespace webserver.Controllers {
    public class MoneyMenagerController : ControllerBase {
        protected IActionResult CreateResponse(UInt64 id, String objectName = "") => OkResponse(id, objectName);

        protected IActionResult ListResponse<T>(IList<T> list, Int32 length, String tableName = "") => OkResponse(new ListOutput<T> { Length = length, Data = list }, $"List of {tableName}");

        protected IActionResult ErrorResponse(UInt32 code, String message) => Response(code, message, statusCode: 400);

        protected IActionResult OkResponse(Object? data = null, String message = "") => Response(0, message, data);

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