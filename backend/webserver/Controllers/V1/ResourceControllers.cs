using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webserver.Api.V1;

namespace webserver.Controllers.V1;

[ApiController, Authorize, Route("api/v1/colors")]
public sealed class ColorsController(IApiCurrentUser currentUser, IResourceQueryService queries) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ColorResponse>>> Get(CancellationToken cancellationToken) =>
        Ok(await queries.GetColorsAsync(await currentUser.RequireIdAsync(User), cancellationToken));
}

[ApiController, Authorize, Route("api/v1/wallets")]
public sealed class WalletsController(IApiCurrentUser currentUser, IResourceQueryService queries, IResourceCommandService commands) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WalletResponse>>> Get(CancellationToken cancellationToken) =>
        Ok(await queries.GetWalletsAsync(await currentUser.RequireIdAsync(User), cancellationToken));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSingle(UInt64 id, CancellationToken cancellationToken) =>
        await queries.GetWalletAsync(await currentUser.RequireIdAsync(User), id, cancellationToken) is { } wallet
            ? Ok(wallet) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(CreateWalletRequest request) {
        var id = await commands.CreateWalletAsync(await currentUser.RequireIdAsync(User), request);
        return Created($"/api/v1/wallets/{id}", new { id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(UInt64 id, UpdateWalletRequest request) {
        await commands.UpdateWalletAsync(await currentUser.RequireIdAsync(User), id, request);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(UInt64 id) {
        await commands.DeleteWalletAsync(await currentUser.RequireIdAsync(User), id);
        return NoContent();
    }

    [HttpPut("{id}/favorite")]
    public async Task<IActionResult> Favorite(UInt64 id, [FromBody] Boolean favorite) {
        await commands.SetWalletFavoriteAsync(await currentUser.RequireIdAsync(User), id, favorite);
        return NoContent();
    }
}

[ApiController, Authorize, Route("api/v1/transaction-types")]
public sealed class TransactionTypesController(IApiCurrentUser currentUser, IResourceQueryService queries, IResourceCommandService commands) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TransactionTypeResponse>>> Get(CancellationToken cancellationToken) =>
        Ok(await queries.GetTransactionTypesAsync(await currentUser.RequireIdAsync(User), cancellationToken));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSingle(UInt64 id, CancellationToken cancellationToken) =>
        await queries.GetTransactionTypeAsync(await currentUser.RequireIdAsync(User), id, cancellationToken) is { } type
            ? Ok(type) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(CreateTransactionTypeRequest request) {
        var id = await commands.CreateTransactionTypeAsync(await currentUser.RequireIdAsync(User), request);
        return Created($"/api/v1/transaction-types/{id}", new { id });
    }
}

[ApiController, Authorize, Route("api/v1/transactions")]
public sealed class TransactionsController(IApiCurrentUser currentUser, IResourceQueryService queries, IResourceCommandService commands) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<PageResponse<TransactionResponse>>> Get([FromQuery] PageQuery page, CancellationToken cancellationToken) =>
        Ok(await queries.GetTransactionsAsync(await currentUser.RequireIdAsync(User), page, cancellationToken));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSingle(UInt64 id, CancellationToken cancellationToken) =>
        await queries.GetTransactionAsync(await currentUser.RequireIdAsync(User), id, cancellationToken) is { } transaction
            ? Ok(transaction) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(CreateTransactionRequest request) {
        var id = await commands.CreateTransactionAsync(await currentUser.RequireIdAsync(User), request);
        return Created($"/api/v1/transactions/{id}", new { id });
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(UInt64 id, UpdateTransactionRequest request) {
        await commands.UpdateTransactionAsync(await currentUser.RequireIdAsync(User), id, request);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(UInt64 id) {
        await commands.DeleteTransactionAsync(await currentUser.RequireIdAsync(User), id);
        return NoContent();
    }
}

[ApiController, Authorize, Route("api/v1/dashboard")]
public sealed class DashboardV1Controller(IApiCurrentUser currentUser, IResourceQueryService queries) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<DashboardResponse>> Get([FromQuery] DashboardQuery range, CancellationToken cancellationToken) =>
        Ok(await queries.GetDashboardAsync(await currentUser.RequireIdAsync(User), range, cancellationToken));
}
