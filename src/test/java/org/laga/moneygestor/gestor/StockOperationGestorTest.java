package org.laga.moneygestor.gestor;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import org.hibernate.query.Query;
import org.hibernate.query.SelectionQuery;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.laga.moneygestor.TestUtilities;
import org.laga.moneygestor.db.entity.StockDb;
import org.laga.moneygestor.db.entity.StockOperationDb;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.StockOperationGestor;
import org.laga.moneygestor.logic.exceptions.NegativeWalletException;
import org.laga.moneygestor.services.models.Stock;
import org.mockito.MockMakers;
import org.mockito.Mockito;
import org.mockito.ArgumentMatchers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class StockOperationGestorTest extends BaseGestorTest<StockOperationDb> {

    private StockOperationGestor gestor;

    @BeforeEach
    public void setup() {
        super.setup();

        gestor = new StockOperationGestor(sessionFactory);

        populateUserLogged();
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35,0.2453304353732256",
            "145.74,-12.45,133.29,-0.0854261012762454"
    })
    public void insert_updateCurrentValue(double initialValue, double operationValue, double expected, double expectedYield) {
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var stockOperation = createStockOperation(stock, VALUE, StockType.MARKET);

        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);

        gestor.insert(userLogged, stockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expectedYield), stockOperation.getCurrentYield(), 0.0000001);
        Assertions.assertFalse(stockOperation.getTfr());
        Assertions.assertNull(stockOperation.getBankTransactionId());

        verifySingleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35",
            "145.74,-12.45,133.29"
    })
    public void insert_createNewTransactionOnDeposit(double initialValue, double operationValue, double expected) {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(1000);
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal VALUE = new BigDecimal(operationValue);

        final Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        var stock = createStock(INITIAL_VALUE);
        var stockOperation = createStockOperation(stock, VALUE, StockType.DEPOSIT);
        var wallet = createWallet(INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        gestor.insert(userLogged, stockOperation, wallet.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertNull(stockOperation.getCurrentYield());
        Assertions.assertTrue(createdTransaction.hasValue());
        TestUtilities.assertionsForFloatNumber(new BigDecimal(operationValue).negate(), createdTransaction.getValue().getValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE.subtract(new BigDecimal(operationValue)), wallet.getValue(), 0.0000001);

        verifySingleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
        verifySaveEntity(TransactionDb.class);
        verifySaveEntity(WalletDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35",
            "145.74,-12.45,133.29"
    })
    public void insert_insertATfrOperation(double initialValue, double operationValue, double expected) {
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var stockOperation = createStockOperation(stock, VALUE, StockType.TFR);

        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);

        gestor.insert(userLogged, stockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertTrue(stockOperation.getTfr());
        Assertions.assertNull(stockOperation.getBankTransactionId());
        Assertions.assertNull(stockOperation.getCurrentYield());

        verifySingleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
    }

    @Test
    public void insert_createNewTransactionOnDepositWalletNotHaveMoney_fail() {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(150);
        final BigDecimal INITIAL_VALUE = new BigDecimal(1500);
        final BigDecimal VALUE = new BigDecimal(200);

        final Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        var stock = createStock(INITIAL_VALUE);
        var stockOperation = createStockOperation(stock, VALUE, StockType.DEPOSIT);
        var wallet = createWallet(INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        Assertions.assertThrows(NegativeWalletException.class, () -> gestor.insert(userLogged, stockOperation, wallet.getId()));

        verifyRollbackEntity();
    }

    @Test
    public void insert_createNewTransactionOnDepositWalletNotHaveMoneyForce() {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(150);
        final BigDecimal INITIAL_VALUE = new BigDecimal(1500);
        final BigDecimal VALUE = new BigDecimal(200);
        final BigDecimal EXPECTED = INITIAL_VALUE.add(VALUE);

        final Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        var stock = createStock(INITIAL_VALUE);
        var stockOperation = createStockOperation(stock, VALUE, StockType.DEPOSIT);
        var wallet = createWallet(INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        gestor.insert(userLogged, stockOperation, wallet.getId(), true);

        TestUtilities.assertionsForFloatNumber(EXPECTED, stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(EXPECTED, stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(INITIAL_VALUE, stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertEquals(createdTransaction.getValue().getId(), stockOperation.getBankTransactionId());
        Assertions.assertFalse(stockOperation.getTfr());
        Assertions.assertNull(stockOperation.getCurrentYield());
        Assertions.assertTrue(createdTransaction.hasValue());
        TestUtilities.assertionsForFloatNumber(VALUE.negate(), createdTransaction.getValue().getValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE.subtract(VALUE), wallet.getValue(), 0.0000001);

        verifySingleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
        verifySaveEntity(TransactionDb.class);
        verifySaveEntity(WalletDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35,0.2453304353732256",
            "145.74,-12.45,133.29,-0.0854261012762454"
    })
    public void update_marketToMarket(double initialValue, double operationValue, double expected, double expectedYield) {
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.MARKET);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.MARKET);

        /* Mock option */
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        gestor.insert(userLogged, toUpdateStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);

        gestor.update(userLogged, newStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expectedYield), toUpdateStockOperation.getCurrentYield(), 0.0000001);
        Assertions.assertFalse(newStockOperation.getTfr());
        Assertions.assertNull(newStockOperation.getBankTransactionId());

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35",
            "145.74,-12.45,133.29"
    })
    public void update_marketToTfr(double initialValue, double operationValue, double expected) {
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.MARKET);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.TFR);

        /* Mock option */
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        gestor.insert(userLogged, toUpdateStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getResourcesInvested(), 0.0000001);
        Assertions.assertFalse(toUpdateStockOperation.getTfr());

        gestor.update(userLogged, newStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertNull(toUpdateStockOperation.getCurrentYield());
        Assertions.assertTrue(toUpdateStockOperation.getTfr());
        Assertions.assertNull(toUpdateStockOperation.getBankTransactionId());

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35",
            "145.74,-12.45,133.29"
    })
    public void update_marketToDeposit(double initialValue, double operationValue, double expected) {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(150);
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.MARKET);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.DEPOSIT);

        var wallet = createWallet(INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        // Mock option
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(StockOperationDb.class), Mockito.any())).thenReturn(toUpdateStockOperation);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        // Transaction mock
        Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        gestor.insert(userLogged, toUpdateStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getResourcesInvested(), 0.0000001);
        Assertions.assertFalse(toUpdateStockOperation.getTfr());
        Assertions.assertNull(toUpdateStockOperation.getBankTransactionId());

        gestor.update(userLogged, toUpdateStockOperation.getId(), newStockOperation, wallet.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertTrue(createdTransaction.hasValue());
        Assertions.assertEquals(createdTransaction.getValue().getId(), newStockOperation.getBankTransactionId());
        Assertions.assertNull(newStockOperation.getCurrentYield());
        Assertions.assertFalse(newStockOperation.getTfr());
        TestUtilities.assertionsForFloatNumber(UPDATE_VALUE.negate(), createdTransaction.getValue().getValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE.subtract(UPDATE_VALUE), wallet.getValue(), 0.0000001);

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35,0.2453304353732256",
            "145.74,-12.45,133.29,-0.0854261012762454"
    })
    public void update_TFRtoMarket(double initialValue, double operationValue, double expected, double expectedYield) {
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.TFR);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.MARKET);

        /* Mock option */
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        gestor.insert(userLogged, toUpdateStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getResourcesInvested(), 0.0000001);
        Assertions.assertTrue(toUpdateStockOperation.getTfr());
        Assertions.assertNull(toUpdateStockOperation.getBankTransactionId());

        gestor.update(userLogged, newStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expectedYield), toUpdateStockOperation.getCurrentYield(), 0.0000001);
        Assertions.assertFalse(newStockOperation.getTfr());
        Assertions.assertNull(newStockOperation.getBankTransactionId());

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35,0.2453304353732256",
            "145.74,-12.45,133.29,-0.0854261012762454"
    })
    public void update_TFRtoTFR(double initialValue, double operationValue, double expected, double expectedYield) {
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.TFR);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.TFR);

        /* Mock option */
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        gestor.insert(userLogged, toUpdateStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getResourcesInvested(), 0.0000001);
        Assertions.assertTrue(toUpdateStockOperation.getTfr());
        Assertions.assertNull(toUpdateStockOperation.getBankTransactionId());

        gestor.update(userLogged, newStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertNull(newStockOperation.getCurrentYield());
        Assertions.assertTrue(newStockOperation.getTfr());
        Assertions.assertNull(newStockOperation.getBankTransactionId());

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35",
            "145.74,-12.45,133.29"
    })
    public void update_TfrToDeposit(double initialValue, double operationValue, double expected) {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(150);
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.TFR);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.DEPOSIT);

        var wallet = createWallet(INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        // Mock option
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(StockOperationDb.class), Mockito.any())).thenReturn(toUpdateStockOperation);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        // Transaction mock
        Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        gestor.insert(userLogged, toUpdateStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getResourcesInvested(), 0.0000001);
        Assertions.assertTrue(toUpdateStockOperation.getTfr());
        Assertions.assertNull(toUpdateStockOperation.getBankTransactionId());

        gestor.update(userLogged, toUpdateStockOperation.getId(), newStockOperation, wallet.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertTrue(createdTransaction.hasValue());
        Assertions.assertEquals(createdTransaction.getValue().getId(), newStockOperation.getBankTransactionId());
        Assertions.assertNull(newStockOperation.getCurrentYield());
        Assertions.assertFalse(newStockOperation.getTfr());
        TestUtilities.assertionsForFloatNumber(UPDATE_VALUE.negate(), createdTransaction.getValue().getValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE.subtract(UPDATE_VALUE), wallet.getValue(), 0.0000001);

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35,0.2453304353732256",
            "145.74,-12.45,133.29,-0.0854261012762454"
    })
    public void update_depositToMarket(double initialValue, double operationValue, double expected, double expectedYield) {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(150);
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.DEPOSIT);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.MARKET);

        var wallet = createWallet(INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        /* Mock option */
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        /* Transaction mock */
        Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        gestor.insert(userLogged, toUpdateStockOperation, wallet.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getResourcesInvested(), 0.0000001);
        Assertions.assertFalse(toUpdateStockOperation.getTfr());
        Assertions.assertNotNull(toUpdateStockOperation.getBankTransactionId());

        gestor.update(userLogged, newStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expectedYield), toUpdateStockOperation.getCurrentYield(), 0.0000001);
        Assertions.assertFalse(newStockOperation.getTfr());
        Assertions.assertNull(newStockOperation.getBankTransactionId());
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE, wallet.getValue(), 0.0000001);

        Mockito.verify(session, Mockito.atLeastOnce()).remove(ArgumentMatchers.any(TransactionDb.class));

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
        verifySaveEntity(TransactionDb.class);
        verifySaveEntity(WalletDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35,0.2453304353732256",
            "145.74,-12.45,133.29,-0.0854261012762454"
    })
    public void update_depositToTfr(double initialValue, double operationValue, double expected, double expectedYield) {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(150);
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.DEPOSIT);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.TFR);

        var wallet = createWallet(INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        /* Mock option */
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        /* Transaction mock */
        Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        gestor.insert(userLogged, toUpdateStockOperation, wallet.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getResourcesInvested(), 0.0000001);
        Assertions.assertFalse(toUpdateStockOperation.getTfr());
        Assertions.assertNotNull(toUpdateStockOperation.getBankTransactionId());

        gestor.update(userLogged, newStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertNull(toUpdateStockOperation.getCurrentYield());
        Assertions.assertTrue(newStockOperation.getTfr());
        Assertions.assertNull(newStockOperation.getBankTransactionId());
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE, wallet.getValue(), 0.0000001);

        Mockito.verify(session, Mockito.atLeastOnce()).remove(ArgumentMatchers.any(TransactionDb.class));

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
        verifySaveEntity(TransactionDb.class);
        verifySaveEntity(WalletDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35,0.2453304353732256",
            "145.74,-12.45,133.29,-0.0854261012762454"
    })
    public void update_depositToDeposit(double initialValue, double operationValue, double expected, double expectedYield) {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(150);
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.DEPOSIT);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.DEPOSIT);

        var wallet = createWallet(INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        /* Mock option */
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        /* Transaction mock */
        Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        gestor.insert(userLogged, toUpdateStockOperation, wallet.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        Assertions.assertNotNull(toUpdateStockOperation.getBankTransactionId());
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE.subtract(FAKE_VALUE), wallet.getValue(), 0.0000001);

        newStockOperation.setBankTransactionId(toUpdateStockOperation.getBankTransactionId());

        gestor.update(userLogged, newStockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertTrue(createdTransaction.hasValue());
        Assertions.assertEquals(createdTransaction.getValue().getId(), newStockOperation.getBankTransactionId());
        Assertions.assertNull(newStockOperation.getCurrentYield());
        Assertions.assertFalse(newStockOperation.getTfr());
        TestUtilities.assertionsForFloatNumber(UPDATE_VALUE.negate(), createdTransaction.getValue().getValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE.subtract(UPDATE_VALUE), wallet.getValue(), 0.0000001);

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
        verifySaveEntity(TransactionDb.class);
        verifySaveEntity(WalletDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35",
            "145.74,-12.45,133.29"
    })
    public void update_depositToDepositChangeWallet(double initialValue, double operationValue, double expected) {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(150);
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("58.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.DEPOSIT);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.DEPOSIT);

        var wallet_1 = createWallet(1, INITIAL_WALLET_VALUE);
        var wallet_2 = createWallet(2, INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        /* Mock option */
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(StockOperationDb.class), Mockito.any())).thenReturn(toUpdateStockOperation);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        /* Transaction mock */
        Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.eq(1))).thenReturn(wallet_1);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.eq(2))).thenReturn(wallet_2);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        gestor.insert(userLogged, toUpdateStockOperation, wallet_1.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        Assertions.assertNotNull(toUpdateStockOperation.getBankTransactionId());
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE.subtract(FAKE_VALUE), wallet_1.getValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE, wallet_2.getValue(), 0.0000001);

        newStockOperation.setBankTransactionId(toUpdateStockOperation.getBankTransactionId());

        gestor.update(userLogged, toUpdateStockOperation.getId(), newStockOperation, wallet_2.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getSubscriptionValue(), 0.0000001);
        Assertions.assertTrue(createdTransaction.hasValue());
        Assertions.assertEquals(createdTransaction.getValue().getId(), newStockOperation.getBankTransactionId());
        Assertions.assertNull(newStockOperation.getCurrentYield());
        TestUtilities.assertionsForFloatNumber(UPDATE_VALUE.negate(), createdTransaction.getValue().getValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE, wallet_1.getValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE.subtract(UPDATE_VALUE), wallet_2.getValue(), 0.0000001);

        verifyDoubleTransaction();
        verifySaveEntity();
        verifySaveEntity(StockDb.class);
        verifySaveEntity(TransactionDb.class);
        verifySaveEntity(WalletDb.class);
    }

    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35,0.2453304353732256"
    })
    public void update_depositToDepositNotEnoughMoney(double initialValue, double operationValue, double expected, double expectedYield) {
        final BigDecimal INITIAL_WALLET_VALUE = new BigDecimal(30);
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal FAKE_VALUE = new BigDecimal("10.14");
        final BigDecimal UPDATE_VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var toUpdateStockOperation = createStockOperation(stock, FAKE_VALUE, StockType.DEPOSIT);
        var newStockOperation = createStockOperation(stock, UPDATE_VALUE, StockType.DEPOSIT);

        var wallet = createWallet(INITIAL_WALLET_VALUE);
        final TestUtilities.ObjectSetter<TransactionDb> createdTransaction = new TestUtilities.ObjectSetter<>();

        /* Mock option */
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(selectQuery.getSingleResultOrNull()).thenReturn(toUpdateStockOperation);

        /* Transaction mock */
        Query<TransactionDb> transactionQuery = Mockito.mock(Query.class);
        Mockito.when(transactionQuery.getSingleResultOrNull()).thenReturn(createdTransaction.getValue());
        Mockito.when(transactionQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(transactionQuery);
        Mockito.when(session.get(ArgumentMatchers.eq(StockDb.class), Mockito.any())).thenReturn(stock);
        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.when(session.createQuery(Mockito.anyString(), ArgumentMatchers.eq(TransactionDb.class))).thenReturn(transactionQuery);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb transaction) {
                createdTransaction.setValue(transaction);
                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());
        Mockito.doAnswer(invocationOnMock -> createdTransaction.getValue()).when(transactionQuery).getSingleResultOrNull();

        gestor.insert(userLogged, toUpdateStockOperation, wallet.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue).add(FAKE_VALUE), stock.getCurrentValue(), 0.0000001);
        Assertions.assertNotNull(toUpdateStockOperation.getBankTransactionId());
        TestUtilities.assertionsForFloatNumber(INITIAL_WALLET_VALUE.subtract(FAKE_VALUE), wallet.getValue(), 0.0000001);

        newStockOperation.setBankTransactionId(toUpdateStockOperation.getBankTransactionId());

        Assertions.assertThrows(NegativeWalletException.class, () -> gestor.update(userLogged, newStockOperation));

        verifyDoubleTransaction();
        verifySaveEntity();
        verifyRollbackEntity();
    }

    private StockDb createStock(BigDecimal value) {
        var stock = new StockDb();

        stock.setId(1);
        stock.setName("stock");
        stock.setUserId(userLogged.getId());
        stock.setSubscriptionDate(LocalDateTime.now().minusMonths(1));
        stock.setCurrentValue(value);
        stock.setSubscriptionValue(value);
        stock.setResourcesInvested(value);
        stock.setCurrentValue(value);

        return stock;
    }

    private StockOperationDb createStockOperation(StockDb stock, BigDecimal value, StockType type) {
        var stockOperation = new StockOperationDb();

        stockOperation.setId(1L);
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
        return createWallet(1, value);
    }

    private WalletDb createWallet(Integer id, BigDecimal value) {
        var wallet = new WalletDb();

        wallet.setId(id);
        wallet.setName("Test wallet");
        wallet.setValue(value);

        return wallet;
    }

    @Override
    protected Class<StockOperationDb> getInnerClass() {
        return StockOperationDb.class;
    }

    private enum StockType {
        MARKET,
        DEPOSIT,
        TFR,
    }
}
