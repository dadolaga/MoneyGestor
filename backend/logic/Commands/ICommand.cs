namespace logic.Commands;

public abstract class ICommand<T> {
    // A parent command calls this method directly so children share its owner, context and transaction.
    internal abstract Task<T> ExecuteAsync(ExecutorManager executorManager, CancellationToken cancellationToken);
}
