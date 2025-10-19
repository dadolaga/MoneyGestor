package org.laga.moneygestor.gestor;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.laga.moneygestor.TestUtilities;
import org.laga.moneygestor.db.entity.StockDb;
import org.laga.moneygestor.db.entity.StockOperationDb;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.StockOperationGestor;
import org.laga.moneygestor.logic.exceptions.NegativeWalletException;
import org.laga.moneygestor.logic.exceptions.NotNewerMovementException;

import java.math.BigDecimal;
import java.time.LocalDate;

public class StockOperationGestorTest extends BaseGestorTest {
    StockOperationGestor gestor;

    @BeforeEach
    public void setup() {
        gestor = new StockOperationGestor(sessionFactory);

        createUserLogged();
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
            "145.74,-12.45"
    })
    public void insert_marketFirstOperation(BigDecimal initialValue, BigDecimal operationValue) {
        var stock = createStock(initialValue);
        var stockOperation = createStockOperation(stock, operationValue, StockType.MARKET);

        gestor.insert(userLogged, stockOperation);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperation = getEntity(StockOperationDb.class, stockOperation.getId());

        Assertions.assertFalse(stockOperation.getTfr());
        Assertions.assertNull(stockOperation.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue, stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(operationValue), stock.getCurrentValue());

        checkIfInserted(stockOperation);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
            "145.74,-12.45"
    })
    public void insert_tfrFirstOperation(BigDecimal initialValue, BigDecimal operationValue) {
        var stock = createStock(initialValue);
        var stockOperation = createStockOperation(stock, operationValue, StockType.TFR);

        gestor.insert(userLogged, stockOperation);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperation = getEntity(StockOperationDb.class, stockOperation.getId());

        Assertions.assertTrue(stockOperation.getTfr());
        Assertions.assertNull(stockOperation.getBankTransactionId());

        Assertions.assertEquals(stock.getSubscriptionValue(), initialValue);
        Assertions.assertEquals(stock.getResourcesInvested(), initialValue.add(operationValue));
        Assertions.assertEquals(stock.getCurrentValue(), initialValue.add(operationValue));

        checkIfInserted(stockOperation);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
            "145.74,-12.45"
    })
    public void insert_bankFirstOperation(BigDecimal initialValue, BigDecimal operationValue) {
        final var walletInit = new BigDecimal(1500);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var stockOperation = createStockOperation(stock, operationValue, StockType.DEPOSIT);

        gestor.insert(userLogged, stockOperation, wallet.getId());

        stock = getEntity(StockDb.class, stock.getId());
        stockOperation = getEntity(StockOperationDb.class, stockOperation.getId());

        Assertions.assertFalse(stockOperation.getTfr());
        Assertions.assertNotNull(stockOperation.getBankTransactionId());

        Assertions.assertEquals(stock.getSubscriptionValue(), initialValue);
        Assertions.assertEquals(stock.getResourcesInvested(), initialValue.add(operationValue));
        Assertions.assertEquals(stock.getCurrentValue(), initialValue.add(operationValue));

        checkIfInserted(stockOperation);

        var bankTransaction = getEntity(TransactionDb.class, stockOperation.getBankTransactionId());

        Assertions.assertNotNull(bankTransaction);
        Assertions.assertEquals(operationValue.negate(), bankTransaction.getValue());
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
    })
    public void insert_bankFirstOperationWalletNotHaveMoney(BigDecimal initialValue, BigDecimal operationValue) {
        final var walletInit = new BigDecimal(20);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var stockOperation = createStockOperation(stock, operationValue, StockType.DEPOSIT);

        Assertions.assertThrows(NegativeWalletException.class, () -> gestor.insert(userLogged, stockOperation, wallet.getId()));
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
    })
    public void insert_bankFirstOperationWalletNotHaveMoneyForce(BigDecimal initialValue, BigDecimal operationValue) {
        final var walletInit = new BigDecimal(20);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var stockOperation = createStockOperation(stock, operationValue, StockType.DEPOSIT);

        gestor.insert(userLogged, stockOperation, wallet.getId(), true);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperation = getEntity(StockOperationDb.class, stockOperation.getId());

        Assertions.assertFalse(stockOperation.getTfr());
        Assertions.assertNotNull(stockOperation.getBankTransactionId());

        Assertions.assertEquals(stock.getSubscriptionValue(), initialValue);
        Assertions.assertEquals(stock.getResourcesInvested(), initialValue.add(operationValue));
        Assertions.assertEquals(stock.getCurrentValue(), initialValue.add(operationValue));

        checkIfInserted(stockOperation);

        var bankTransaction = getEntity(TransactionDb.class, stockOperation.getBankTransactionId());

        Assertions.assertNotNull(bankTransaction);
        Assertions.assertEquals(operationValue.negate(), bankTransaction.getValue());
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void insert_marketSecondOperation(BigDecimal initialValue, BigDecimal firstOperationValue, BigDecimal secondOperationValue) {
        var stock = createStock(initialValue);
        var stockOperation_1 = createStockOperation(stock, firstOperationValue, StockType.MARKET);
        var stockOperation_2 = createStockOperation(stock, secondOperationValue, StockType.MARKET);
        stockOperation_2.setDate(stockOperation_2.getDate().plusDays(1));

        gestor.insert(userLogged, stockOperation_1);
        gestor.insert(userLogged, stockOperation_2);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperation_2 = getEntity(StockOperationDb.class, stockOperation_2.getId());

        Assertions.assertFalse(stockOperation_2.getTfr());
        Assertions.assertNull(stockOperation_2.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue, stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(firstOperationValue).add(secondOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperation_2);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void insert_tfrSecondOperation(BigDecimal initialValue, BigDecimal firstOperationValue, BigDecimal secondOperationValue) {
        var stock = createStock(initialValue);
        var stockOperation_1 = createStockOperation(stock, firstOperationValue, StockType.TFR);
        var stockOperation_2 = createStockOperation(stock, secondOperationValue, StockType.TFR);
        stockOperation_2.setDate(stockOperation_2.getDate().plusDays(1));

        gestor.insert(userLogged, stockOperation_1);
        gestor.insert(userLogged, stockOperation_2);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperation_2 = getEntity(StockOperationDb.class, stockOperation_2.getId());

        Assertions.assertTrue(stockOperation_2.getTfr());
        Assertions.assertNull(stockOperation_2.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue.add(firstOperationValue).add(secondOperationValue), stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(firstOperationValue).add(secondOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperation_2);
    }

    @Disabled("Function no longer implemented")
    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
    })
    public void insert_beforeLastMovement_throw(BigDecimal initialValue, BigDecimal operationValue) {
        var stock = createStock(initialValue);
        var stockOperation = createStockOperation(stock, operationValue, StockType.MARKET);
        var oldStockOperation = createStockOperation(stock, operationValue, StockType.MARKET);
        oldStockOperation.setDate(LocalDate.now().minusDays(12));

        gestor.insert(userLogged, stockOperation);

        Assertions.assertThrows(NotNewerMovementException.class, () -> gestor.insert(userLogged, oldStockOperation));
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void insert_bankSecondOperation(BigDecimal initialValue, BigDecimal firstOperationValue, BigDecimal secondOperationValue) {
        final var walletInit = new BigDecimal(1500);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var stockOperation_1 = createStockOperation(stock, firstOperationValue, StockType.MARKET);
        var stockOperation_2 = createStockOperation(stock, secondOperationValue, StockType.MARKET);
        stockOperation_2.setDate(stockOperation_2.getDate().plusDays(1));

        gestor.insert(userLogged, stockOperation_1, wallet.getId());
        gestor.insert(userLogged, stockOperation_2, wallet.getId());

        stock = getEntity(StockDb.class, stock.getId());
        stockOperation_2 = getEntity(StockOperationDb.class, stockOperation_2.getId());

        Assertions.assertFalse(stockOperation_2.getTfr());
        Assertions.assertNotNull(stockOperation_2.getBankTransactionId());
        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue.add(firstOperationValue).add(secondOperationValue), stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(firstOperationValue).add(secondOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperation_2);

        var bankTransaction = getEntity(TransactionDb.class, stockOperation_2.getBankTransactionId());

        Assertions.assertNotNull(bankTransaction);
        Assertions.assertEquals(secondOperationValue.negate(), bankTransaction.getValue());
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_marketToMarket(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        var stock = createStock(initialValue);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.MARKET);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.MARKET);

        gestor.insert(userLogged, stockOperationOld);
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertFalse(stockOperationNew.getTfr());
        Assertions.assertNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue, stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_marketToTfr(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        var stock = createStock(initialValue);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.MARKET);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.TFR);

        gestor.insert(userLogged, stockOperationOld);
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertTrue(stockOperationNew.getTfr());
        Assertions.assertNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_marketToDeposit(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        var stock = createStock(initialValue);
        final var walletInit = new BigDecimal(1500);
        var wallet = createWallet(walletInit);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.MARKET);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.DEPOSIT);

        gestor.insert(userLogged, stockOperationOld);
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew, wallet.getId());

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertFalse(stockOperationNew.getTfr());
        Assertions.assertNotNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);

        var bankTransaction = getEntity(TransactionDb.class, stockOperationNew.getBankTransactionId());

        Assertions.assertNotNull(bankTransaction);
        Assertions.assertEquals(newOperationValue.negate(), bankTransaction.getValue());
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_tfrToMarket(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        var stock = createStock(initialValue);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.TFR);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.MARKET);

        gestor.insert(userLogged, stockOperationOld);
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertFalse(stockOperationNew.getTfr());
        Assertions.assertNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue, stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_tfrToTfr(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        var stock = createStock(initialValue);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.TFR);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.TFR);

        gestor.insert(userLogged, stockOperationOld);
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertTrue(stockOperationNew.getTfr());
        Assertions.assertNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_tfrToDeposit(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        var stock = createStock(initialValue);
        final var walletInit = new BigDecimal(1500);
        var wallet = createWallet(walletInit);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.TFR);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.DEPOSIT);

        gestor.insert(userLogged, stockOperationOld);
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew, wallet.getId());

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertFalse(stockOperationNew.getTfr());
        Assertions.assertNotNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);

        var bankTransaction = getEntity(TransactionDb.class, stockOperationNew.getBankTransactionId());

        Assertions.assertNotNull(bankTransaction);
        Assertions.assertEquals(newOperationValue.negate(), bankTransaction.getValue());
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_depositToMarket(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        final var walletInit = new BigDecimal(1500);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.DEPOSIT);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.MARKET);

        gestor.insert(userLogged, stockOperationOld, wallet.getId());
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertFalse(stockOperationNew.getTfr());
        Assertions.assertNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue, stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);

        try(var session = sessionFactory.openSession()) {
            wallet = session.get(WalletDb.class, wallet.getId());
            var transactionList = session.createQuery("FROM TransactionDb", TransactionDb.class).list();

            TestUtilities.assertionsForFloatNumber(walletInit, wallet.getValue(), 0.0000001);
            Assertions.assertEquals(0, transactionList.size());
        }
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_depositToTfr(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        final var walletInit = new BigDecimal(1500);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.DEPOSIT);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.TFR);

        gestor.insert(userLogged, stockOperationOld, wallet.getId());
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew);

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertTrue(stockOperationNew.getTfr());
        Assertions.assertNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);

        try(var session = sessionFactory.openSession()) {
            wallet = session.get(WalletDb.class, wallet.getId());
            var transactionList = session.createQuery("FROM TransactionDb", TransactionDb.class).list();

            TestUtilities.assertionsForFloatNumber(walletInit, wallet.getValue(), 0.0000001);
            Assertions.assertEquals(0, transactionList.size());
        }
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_depositToDeposit(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        final var walletInit = new BigDecimal(1500);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.DEPOSIT);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.DEPOSIT);

        gestor.insert(userLogged, stockOperationOld, wallet.getId());
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew, wallet.getId());

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertFalse(stockOperationNew.getTfr());
        Assertions.assertNotNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);

        wallet = getEntity(WalletDb.class, wallet.getId());
        var bankTransaction = getEntity(TransactionDb.class, stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(walletInit.subtract(newOperationValue), wallet.getValue());
        Assertions.assertNotNull(bankTransaction);
        Assertions.assertEquals(newOperationValue.negate(), bankTransaction.getValue());
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,23.13",
            "145.74,-12.45,-45.86"
    })
    public void update_depositToDepositChangeWallet(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        final var walletInit = new BigDecimal(1500);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var wallet2 = createWallet(walletInit);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.DEPOSIT);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.DEPOSIT);

        gestor.insert(userLogged, stockOperationOld, wallet.getId());
        gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew, wallet2.getId());

        stock = getEntity(StockDb.class, stock.getId());
        stockOperationNew = getEntity(StockOperationDb.class, stockOperationOld.getId());

        Assertions.assertFalse(stockOperationNew.getTfr());
        Assertions.assertNotNull(stockOperationNew.getBankTransactionId());

        Assertions.assertEquals(initialValue, stock.getSubscriptionValue());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getResourcesInvested());
        Assertions.assertEquals(initialValue.add(newOperationValue), stock.getCurrentValue());

        checkIfInserted(stockOperationNew);

        try(var session = sessionFactory.openSession()) {
            wallet = session.get(WalletDb.class, wallet.getId());
            wallet2 = session.get(WalletDb.class, wallet2.getId());
            var transactionList = session.createQuery("FROM TransactionDb", TransactionDb.class).list();

            TestUtilities.assertionsForFloatNumber(walletInit, wallet.getValue(), 0.0000001);
            TestUtilities.assertionsForFloatNumber(walletInit.subtract(newOperationValue), wallet2.getValue(), 0.0000001);
            Assertions.assertEquals(1, transactionList.size());
        }
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,58.13",
    })
    public void update_depositToDepositNotEnoughMoney(BigDecimal initialValue, BigDecimal oldOperationValue, BigDecimal newOperationValue) {
        final var walletInit = new BigDecimal(50);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var stockOperationOld = createStockOperation(stock, oldOperationValue, StockType.DEPOSIT);
        var stockOperationNew = createStockOperation(stock, newOperationValue, StockType.DEPOSIT);

        gestor.insert(userLogged, stockOperationOld, wallet.getId());
        stockOperationNew.setBankTransactionId(stockOperationOld.getBankTransactionId());
        Assertions.assertThrows(NegativeWalletException.class, () -> gestor.update(userLogged, stockOperationOld.getId(), stockOperationNew));
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
    })
    public void delete_market(BigDecimal initialValue, BigDecimal operationValue) {
        var stock = createStock(initialValue);
        var stockOperationOld = createStockOperation(stock, operationValue, StockType.MARKET);

        gestor.insert(userLogged, stockOperationOld);
        
        gestor.deleteById(userLogged, stockOperationOld.getId());
        
        stock = getEntity(StockDb.class, stock.getId());

        TestUtilities.assertionsForFloatNumber(initialValue, stock.getCurrentValue(), 0.000001);
        TestUtilities.assertionsForFloatNumber(initialValue, stock.getSubscriptionValue(), 0.000001);
        TestUtilities.assertionsForFloatNumber(initialValue, stock.getSubscriptionValue(), 0.000001);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
    })
    public void delete_Tfr(BigDecimal initialValue, BigDecimal operationValue) {
        var stock = createStock(initialValue);
        var stockOperationOld = createStockOperation(stock, operationValue, StockType.TFR);

        gestor.insert(userLogged, stockOperationOld);

        gestor.deleteById(userLogged, stockOperationOld.getId());

        stock = getEntity(StockDb.class, stock.getId());

        TestUtilities.assertionsForFloatNumber(initialValue, stock.getCurrentValue(), 0.000001);
        TestUtilities.assertionsForFloatNumber(initialValue, stock.getSubscriptionValue(), 0.000001);
        TestUtilities.assertionsForFloatNumber(initialValue, stock.getSubscriptionValue(), 0.000000);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
    })
    public void delete_deposit(BigDecimal initialValue, BigDecimal operationValue) {        
        final var walletInit = new BigDecimal(1500);
        var stock = createStock(initialValue);
        var wallet = createWallet(walletInit);
        var stockOperation = createStockOperation(stock, operationValue, StockType.DEPOSIT);

        gestor.insert(userLogged, stockOperation, wallet.getId());

        gestor.deleteById(userLogged, stockOperation.getId());

        stock = getEntity(StockDb.class, stock.getId());

        TestUtilities.assertionsForFloatNumber(initialValue, stock.getCurrentValue(), 0.000001);
        TestUtilities.assertionsForFloatNumber(initialValue, stock.getSubscriptionValue(), 0.000001);
        TestUtilities.assertionsForFloatNumber(initialValue, stock.getSubscriptionValue(), 0.000001);

        try (var session = sessionFactory.openSession()) {
            wallet = session.get(WalletDb.class, wallet.getId());
            var transactionList = session.createQuery("FROM TransactionDb", TransactionDb.class).list();

            TestUtilities.assertionsForFloatNumber(walletInit, wallet.getValue(), 0.000001);
            Assertions.assertEquals(0, transactionList.size());
        }
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12",
    })
    public void delete_beforeLastMovement_throw(BigDecimal initialValue, BigDecimal operationValue) {
        var stock = createStock(initialValue);
        var stockOperation = createStockOperation(stock, operationValue, StockType.MARKET);
        var oldStockOperation = createStockOperation(stock, operationValue, StockType.MARKET);
        oldStockOperation.setDate(LocalDate.now().minusDays(12));

        gestor.insert(userLogged, oldStockOperation);
        gestor.insert(userLogged, stockOperation);

        Assertions.assertThrows(NotNewerMovementException.class, () -> gestor.deleteById(userLogged, oldStockOperation.getId()));
    }

    private void checkIfInserted(StockOperationDb expected) {
        try (var session = sessionFactory.openSession()) {
            var inserted = session.get(StockOperationDb.class, expected.getId());

            checkIfOperationEquals(expected, inserted);
        }
    }

    private void checkIfOperationEquals(StockOperationDb expected, StockOperationDb actual) {
        Assertions.assertNotEquals(expected.hashCode(), actual.hashCode());

        Assertions.assertEquals(expected.getDescription(), actual.getDescription());
        Assertions.assertEquals(expected.getDate(), actual.getDate());
        Assertions.assertEquals(expected.getStockId(), actual.getStockId());
        Assertions.assertEquals(expected.getValue(), actual.getValue());
        Assertions.assertEquals(expected.getTfr(), actual.getTfr());
        Assertions.assertEquals(expected.getUserId(), actual.getUserId());
        Assertions.assertEquals(expected.getBankTransactionId(), actual.getBankTransactionId());
    }

    private StockDb createStock(BigDecimal value) {
        var stock = new StockDb();

        stock.setName("stock");
        stock.setUserId(userLogged.getId());
        stock.setSubscriptionDate(LocalDate.now().minusMonths(1));
        stock.setCurrentValue(value);
        stock.setSubscriptionValue(value);
        stock.setResourcesInvested(value);
        stock.setCurrentValue(value);

        addEntity(stock);

        return stock;
    }

    private StockOperationDb createStockOperation(StockDb stock, BigDecimal value, StockType type) {
        var stockOperation = new StockOperationDb();

        stockOperation.setDescription("My new operation");
        stockOperation.setDate(LocalDate.now());
        stockOperation.setValue(value);
        stockOperation.setUserId(userLogged.getId());
        stockOperation.setStockId(stock.getId());
        stockOperation.setStock(stock);
        stockOperation.setTfr(type == StockType.TFR);

        return stockOperation;
    }

    private WalletDb createWallet(BigDecimal value) {
      var wallet = new WalletDb();

      wallet.setName("Test wallet");
      wallet.setValue(value);

      addEntity(wallet);

      return wallet;
    }

    private enum StockType {
        MARKET,
        DEPOSIT,
        TFR,
    }
}
