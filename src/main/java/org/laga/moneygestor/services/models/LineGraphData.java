package org.laga.moneygestor.services.models;

import java.util.List;

public class LineGraphData<LINE, VALUES> {
    private LINE line;
    private List<VALUES> values;

    public LINE getLine() {
        return line;
    }

    public void setLine(LINE line) {
        this.line = line;
    }

    public List<VALUES> getValues() {
        return values;
    }

    public void setValues(List<VALUES> values) {
        this.values = values;
    }
}
