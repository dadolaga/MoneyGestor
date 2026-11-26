using logic.Commands.Transaction;

namespace TestProject.Samples;

internal class TransactionSample {
    private const String DEFAULT_DESCRIPTION = "Test transaction";
    private static readonly DateOnly DEFAULT_DATE = new(2026, 01, 2);
    private const Decimal DEFAULT_VALUE = 32.24m;

    public String? Description { get; init; }
    public String? LongDescription { get; init; }
    public DateOnly Date { get; init; }
    public UInt64 TransactionTypeId { get; init; }
    public UInt64 WalletId { get; init; }
    public UInt64? WalletDestinationId { get; init; }
    public Decimal Value { get; init; }
    public UInt64? UserId { get; init; }
    public AddTransactionCommand AddTransactionCommand { get; init; }

    public TransactionSample(
        UInt64 transactionTypeId,
        UInt64 walletId,
        UInt64? walletDestinationId = null,
        String? description = DEFAULT_DESCRIPTION,
        String? longDescription = null,
        DateOnly? date = null,
        Decimal value = DEFAULT_VALUE,
        UInt64? userId = null) {
        Description = description;
        LongDescription = longDescription;
        Date = date ?? DEFAULT_DATE;
        TransactionTypeId = transactionTypeId;
        WalletId = walletId;
        WalletDestinationId = walletDestinationId;
        Value = value;
        UserId = userId;

        AddTransactionCommand = new AddTransactionCommand(
            description: Description,
            longDescription: LongDescription,
            date: Date,
            walletId: WalletId,
            walletDestinationId: WalletDestinationId,
            value: Value,
            transactionTypeId: TransactionTypeId,
            userId: userId);
    }
}