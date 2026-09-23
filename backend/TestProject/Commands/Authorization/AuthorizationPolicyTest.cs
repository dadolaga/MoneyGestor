using database.Models;
using logic;
using logic.Commands.Transaction;
using logic.Commands.Wallets;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using TestProject.Base;
using TestProject.Samples;
using TestProject.Utils;

namespace TestProject.Commands.Authorization;

[TestFixture]
[Category("Security")]
internal class AuthorizationPolicyTest : ExecutorBase {
    [TearDown]
    public async Task CleanDatabase() {
        using var database = DatabaseFactory.Use();
        await database.Transactions.ExecuteDeleteAsync();
        await database.Wallets.ExecuteDeleteAsync();
        await database.TransactionTypes.Where(type => type.UserId != null).ExecuteDeleteAsync();
        await database.Colors.Where(color => color.UserId != null).ExecuteDeleteAsync();
        await database.Logins.ExecuteDeleteAsync();
        await database.Users.ExecuteDeleteAsync();
    }

    [Test]
    public async Task EditWalletCannotModifyAnotherUsersWallet() {
        var owner = new UserSample();
        var ownerExecutor = await TestUtils.CreateExecutorManagerForUser(owner);
        var wallet = new WalletSample();
        await ownerExecutor.Execute(wallet.AddWalletCommand);

        var otherUser = new UserSample(username: "other_user", email: "other@test.me");
        var otherExecutor = await TestUtils.CreateExecutorManagerForUser(otherUser);
        var edit = new EditWalletCommand(wallet.AddWalletCommand.Result, name: "forbidden");

        Assert.ThrowsAsync<ObjectNotFoundException>(async () => await otherExecutor.Execute(edit));
    }

    [Test]
    public async Task WalletCannotReferenceAnotherUsersColor() {
        var colorOwner = new UserSample();
        var colorOwnerExecutor = await TestUtils.CreateExecutorManagerForUser(colorOwner);
        using var database = DatabaseFactory.Use();
        var color = new ColorDb { Name = "Private", Value = 0x112233, UserId = colorOwner.AddNewUserExecutor.Result };
        database.Colors.Add(color);
        await database.SaveChangesAsync();

        var otherUser = new UserSample(username: "other_user", email: "other@test.me");
        var otherExecutor = await TestUtils.CreateExecutorManagerForUser(otherUser);
        var wallet = new WalletSample(colorId: color.Id);

        Assert.ThrowsAsync<ObjectNotFoundException>(async () => await otherExecutor.Execute(wallet.AddWalletCommand));
        GC.KeepAlive(colorOwnerExecutor);
    }

    [Test]
    public async Task TransactionCannotReferenceAnotherUsersType() {
        var typeOwner = new UserSample();
        var typeOwnerExecutor = await TestUtils.CreateExecutorManagerForUser(typeOwner);
        var type = new AddTransactionTypeCommand("Private type");
        await typeOwnerExecutor.Execute(type);

        var otherUser = new UserSample(username: "other_user", email: "other@test.me");
        var otherExecutor = await TestUtils.CreateExecutorManagerForUser(otherUser);
        var wallet = new WalletSample();
        await otherExecutor.Execute(wallet.AddWalletCommand);
        var transaction = new TransactionSample(type.Result, wallet.AddWalletCommand.Result);

        Assert.ThrowsAsync<ObjectNotFoundException>(async () => await otherExecutor.Execute(transaction.AddTransactionCommand));
    }

    [Test]
    public async Task TransactionOwnerCannotBeSuppliedByClient() {
        var actor = new UserSample();
        var actorExecutor = await TestUtils.CreateExecutorManagerForUser(actor);
        var wallet = new WalletSample();
        await actorExecutor.Execute(wallet.AddWalletCommand);
        var type = new AddTransactionTypeCommand("Actor type");
        await actorExecutor.Execute(type);

        var otherUser = new UserSample(username: "other_user", email: "other@test.me");
        await TestUtils.CreateExecutorManagerForUser(otherUser);
        var transaction = new TransactionSample(
            type.Result,
            wallet.AddWalletCommand.Result,
            userId: otherUser.AddNewUserExecutor.Result);

        Assert.ThrowsAsync<UserNotHavePermissionExcpetion>(async () => await actorExecutor.Execute(transaction.AddTransactionCommand));
    }
}
