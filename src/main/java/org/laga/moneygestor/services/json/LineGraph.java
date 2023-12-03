package org.laga.moneygestor.services.json;

import java.util.List;

public class LineGraph<X, Y> {
    private String id;
    private String color;
    private List<DataElement<X, Y>> data;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public List<DataElement<X, Y>> getData() {
        return data;
    }

    public void setData(List<DataElement<X, Y>> data) {
        this.data = data;
    }

    public static class DataElement<X, Y> {
        private X x;
        private Y y;

        public X getX() {
            return x;
        }

        public void setX(X x) {
            this.x = x;
        }

        public Y getY() {
            return y;
        }

        public void setY(Y y) {
            this.y = y;
        }
    }
}
