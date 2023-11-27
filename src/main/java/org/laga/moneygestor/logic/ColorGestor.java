package org.laga.moneygestor.logic;

import org.laga.moneygestor.db.entity.ColorDb;
import org.laga.moneygestor.services.ColorRest;
import org.laga.moneygestor.services.json.Color;

import java.util.LinkedList;
import java.util.List;

public class ColorGestor {
    public static Color convertToRest(ColorDb colorDb) {
        Color color = new Color();

        color.setColor(colorDb.getColor());

        return color;
    }

    public static List<Color> convertToRest(List<ColorDb> colorDbs) {
        List<Color> colors = new LinkedList<>();

        for(var color : colorDbs) {
            colors.add(convertToRest(color));
        }

        return colors;
    }
}
