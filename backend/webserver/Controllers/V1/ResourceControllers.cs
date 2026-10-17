using logic;
using logic.Commands.Transaction;
using logic.Commands.Wallets;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webserver.Api.V1;
using webserver.Auth;

namespace webserver.Controllers.V1;

[ApiController, Authorize, Route("api/v1/colors")]
public sealed class ColorsController(IApiCurrentUser currentUser, IResourceQueryService queries) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ColorResponse>>> Get(CancellationToken cancellationToken) =>
        Ok(await queries.GetColorsAsync(currentUser.RequireId(User), cancellationToken));
}

[ApiController, Authorize, Route("api/v1/wallets")]
public sealed class WalletsController(IApiCurrentUser currentUser, IResourceQueryService queries, ExecutorManager executor) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WalletResponse>>> Get(CancellationToken cancellationToken) =>
        Ok(await queries.GetWalletsAsync(currentUser.RequireId(User), cancellationToken));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSingle(UInt64 id, CancellationToken cancellationToken) =>
        await queries.GetWalletAsync(currentUser.RequireId(User), id, cancellationToken) is { } wallet
            ? Ok(wallet) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(CreateWalletRequest request, CancellationToken cancellationToken) {
        var ownerId = currentUser.RequireId(User);
        var command = new AddNewWalletCommand(request.Name.Trim(), request.InitialValue, request.ColorId, request.Details?.ToModel(), request.ColorValue);
        var id = await executor.ExecuteAsync(ownerId, command, cancellationToken);
        return Created($"/api/v1/wallets/{id}", new { id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(UInt64 id, UpdateWalletRequest request, CancellationToken cancellationToken) {
        var ownerId = currentUser.RequireId(User);
        var command = new EditWalletCommand(id, request.Name, request.ColorId, request.Details?.ToModel(), request.ColorValue);
        await executor.ExecuteAsync(ownerId, command, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(UInt64 id, CancellationToken cancellationToken) {
        await executor.ExecuteAsync(currentUser.RequireId(User), new DeleteWalletCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPut("{id}/favorite")]
    public async Task<IActionResult> Favorite(UInt64 id, [FromBody] Boolean favorite, CancellationToken cancellationToken) {
        await executor.ExecuteAsync(currentUser.RequireId(User), new FavoriteWalletCommand(id, favorite), cancellationToken);
        return NoContent();
    }
}

[ApiController, Authorize, Route("api/v1/transaction-types")]
public sealed class TransactionTypesController(IApiCurrentUser currentUser, IResourceQueryService queries, ExecutorManager executor) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TransactionTypeResponse>>> Get(CancellationToken cancellationToken) =>
        Ok(await queries.GetTransactionTypesAsync(currentUser.RequireId(User), cancellationToken));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSingle(UInt64 id, CancellationToken cancellationToken) =>
        await queries.GetTransactionTypeAsync(currentUser.RequireId(User), id, cancellationToken) is { } type
            ? Ok(type) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(CreateTransactionTypeRequest request, CancellationToken cancellationToken) {
        var id = await executor.ExecuteAsync(currentUser.RequireId(User), new AddTransactionTypeCommand(request.Name.Trim()), cancellationToken);
        return Created($"/api/v1/transaction-types/{id}", new { id });
    }
}

[ApiController, Authorize, Route("api/v1/transactions")]
public sealed class TransactionsController(IApiCurrentUser currentUser, IResourceQueryService queries, ExecutorManager executor) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<PageResponse<TransactionResponse>>> Get([FromQuery] TransactionListQuery query, CancellationToken cancellationToken) =>
        Ok(await queries.GetTransactionsAsync(currentUser.RequireId(User), query, cancellationToken));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSingle(UInt64 id, CancellationToken cancellationToken) =>
        await queries.GetTransactionAsync(currentUser.RequireId(User), id, cancellationToken) is { } transaction
            ? Ok(transaction) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(CreateTransactionRequest request, CancellationToken cancellationToken) {
        var ownerId = currentUser.RequireId(User);
        var command = new AddTransactionCommand(request.Description, request.LongDescription, request.Date!.Value,
            request.WalletId, request.Value, request.TypeId, request.DestinationWalletId);
        var id = await executor.ExecuteAsync(ownerId, command, cancellationToken);
        return Created($"/api/v1/transactions/{id}", new { id });
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(UInt64 id, UpdateTransactionRequest request, CancellationToken cancellationToken) {
        var ownerId = currentUser.RequireId(User);
        var command = new UpdateTransactionCommand(id, request.Description, request.LongDescription, request.Date,
            request.WalletId, request.DestinationWalletId, request.Value, request.TypeId,
            overwriteDescription: request.DescriptionSpecified,
            overwriteLongDescription: request.LongDescriptionSpecified);
        await executor.ExecuteAsync(ownerId, command, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(UInt64 id, CancellationToken cancellationToken) {
        await executor.ExecuteAsync(currentUser.RequireId(User), new DeleteTransactionCommand(id), cancellationToken);
        return NoContent();
    }
}

[ApiController, Authorize, Route("api/v1/dashboard")]
public sealed class DashboardV1Controller(IApiCurrentUser currentUser, IResourceQueryService queries) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<DashboardResponse>> Get([FromQuery] DashboardQuery range, CancellationToken cancellationToken) =>
        Ok(await queries.GetDashboardAsync(currentUser.RequireId(User), range, cancellationToken));
}
