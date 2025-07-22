package org.laga.moneygestor.gestor;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.laga.moneygestor.TestUtilities;
import org.laga.moneygestor.db.entity.StockDb;
import org.laga.moneygestor.db.entity.StockOperationDb;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.StockOperationGestor;
import org.laga.moneygestor.services.models.Stock;
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
            "147.23,36.12,183.35",
            "145.74,-12.45,133.29"
    })
    public void insert_updateCurrentValue(double initialValue, double operationValue, double expected) {
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var stockOperation = createStockOperation(stock, VALUE, StockType.MARKET);

        gestor.insert(userLogged, stockOperation);

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(initialValue), stock.getResourcesInvested(), 0.0000001);

        verifySaveEntity();
        verifySaveEntity(StockDb.class);
    }
/*
    @ParameterizedTest
    @CsvSource({
            "147.23,36.12,183.35",
            "145.74,-12.45,133.29"
    })
    public void insert_createNewTransactionOnDeposit(double initialValue, double operationValue, double expected) {
        final BigDecimal INITIAL_VALUE = new BigDecimal(initialValue);
        final BigDecimal VALUE = new BigDecimal(operationValue);

        var stock = createStock(INITIAL_VALUE);
        var stockOperation = createStockOperation(stock, VALUE, StockType.DEPOSIT);
        var wallet = createWallet(new BigDecimal(1000));

        Mockito.when(session.get(ArgumentMatchers.eq(WalletDb.class), ArgumentMatchers.any(Integer.class))).thenReturn(wallet);
        Mockito.doAnswer(invocation  -> {
            if(invocation.getArgument(0) instanceof TransactionDb) {
                var transaction = (TransactionDb) invocation.getArgument(0);

                transaction.setId(1L);
            }

            return null;
        }).when(session).persist(Mockito.any());

        gestor.insert(userLogged, stockOperation, wallet.getId());

        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getCurrentValue(), 0.0000001);
        TestUtilities.assertionsForFloatNumber(new BigDecimal(expected), stock.getResourcesInvested(), 0.0000001);

        verifySaveEntity();
        verifySaveEntity(StockDb.class);
        verifySaveEntity(TransactionDb.class);
        verifySaveEntity(WalletDb.class);
    }
 */

    private StockDb createStock(BigDecimal value) {
        var stock = new StockDb();

        stock.setId(1);
        stock.setName("stock");
        stock.setUserId(userLogged.getId());
        stock.setSubscriptionDate(LocalDateTime.now().minusMonths(1));
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
        var wallet = new WalletDb();

        wallet.setId(1);
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
