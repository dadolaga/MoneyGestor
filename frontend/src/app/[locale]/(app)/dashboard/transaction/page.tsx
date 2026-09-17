import { TransactionsPage } from '@/features/transactions/transactions-page';
import { transactionStateFixtures } from '@/lib/fixtures/finance';

export default function TransactionPage() {
    return <TransactionsPage initialState={transactionStateFixtures.ready} />;
}
