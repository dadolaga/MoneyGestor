import { WalletsPage } from '@/features/wallets/wallets-page';
import { walletStateFixtures } from '@/lib/fixtures/finance';

export default function WalletPage() {
    return <WalletsPage initialState={walletStateFixtures.ready} />;
}
