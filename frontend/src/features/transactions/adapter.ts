import type { Transaction } from '@/models/backend';

import type { TransactionViewModel } from './model';

export function toTransactionViewModels(dtos: Transaction[]): TransactionViewModel[] {
    return dtos.flatMap((transaction) =>
        transaction.id === undefined || transaction.value === undefined
            ? []
            : [
                  {
                      id: transaction.id,
                      description: transaction.description,
                      date: transaction.date,
                      typeName: transaction.transactionType?.name,
                      walletName: transaction.wallet?.name,
                      destinationWalletName: transaction.walletDestination?.name,
                      value: transaction.value,
                      isTransfer: transaction.walletDestination !== undefined,
                  },
              ],
    );
}
