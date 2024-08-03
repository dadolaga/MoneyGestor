package org.laga.moneygestor.logic;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class LineGraph<LINE, VALUE> {
    private final Map<LINE, List<VALUE>> values;
    private final Comparator<LINE> comparator;

    public LineGraph(Comparator<LINE> comparator) {
        this.comparator = comparator;
        values = new LinkedHashMap<>();
    }

    public void addNewLine(LINE line, List<VALUE> values) {
        this.values.keySet().forEach(key -> {
            if(comparator.compare(line, key) == 0)
                throw new IllegalArgumentException("Try to insert duplicate key");
        });

        this.values.put(line, values);
    }

    public Map<LINE, List<VALUE>> getValues() {
        return values;
    }
}
