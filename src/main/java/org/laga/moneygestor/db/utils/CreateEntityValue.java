package org.laga.moneygestor.db.utils;

import org.laga.moneygestor.db.entity.ColorDb;
import org.laga.moneygestor.db.entity.TransactionTypeDb;

public class CreateEntityValue {
    public static ColorDb createColor(String hexColor) {
        ColorDb color = new ColorDb();

        color.setColor(hexColor);

        return color;
    }

    public static TransactionTypeDb createTransactionType(int id, String text) {
        TransactionTypeDb transactionType = new TransactionTypeDb();

        transactionType.setId(id);
        transactionType.setName(text);

        return transactionType;
    }
}
