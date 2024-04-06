package org.laga.moneygestor.db;

import org.laga.moneygestor.db.entity.ColorDb;
import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.db.repository.ColorRepository;
import org.laga.moneygestor.db.repository.TransactionTypeRepository;
import org.laga.moneygestor.db.utils.CreateEntityValue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.domain.Example;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    public static final ColorDb COLOR_1 = CreateEntityValue.createColor("912F40");
    public static final ColorDb COLOR_2 = CreateEntityValue.createColor("729B79");
    public static final ColorDb COLOR_3 = CreateEntityValue.createColor("04471C");
    public static final TransactionTypeDb TRANSACTION_TYPE_SWITCH = CreateEntityValue.createTransactionType(1, "Scambio");
    public static final TransactionTypeDb TRANSACTION_TYPE_TIE = CreateEntityValue.createTransactionType(2, "Pareggio");

    private ColorRepository colorRepository;
    private TransactionTypeRepository transactionTypeRepository;

    @Autowired
    public DatabaseInitializer(ColorRepository colorRepository, TransactionTypeRepository transactionTypeRepository) {
        this.colorRepository = colorRepository;
        this.transactionTypeRepository = transactionTypeRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        insertIfNotExist(colorRepository, COLOR_1);
        insertIfNotExist(colorRepository, COLOR_2);
        insertIfNotExist(colorRepository, COLOR_3);

        insertIfNotExist(transactionTypeRepository, TRANSACTION_TYPE_SWITCH);
        insertIfNotExist(transactionTypeRepository, TRANSACTION_TYPE_TIE);
    }

    @SuppressWarnings({"unchecked"})
    private void insertIfNotExist(JpaRepository repository, Object objectToInsert) {
        if(!repository.exists(Example.of(objectToInsert)))
            repository.saveAndFlush(objectToInsert);
    }

}
