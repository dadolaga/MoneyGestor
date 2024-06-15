package org.laga.moneygestor.utils;

import java.util.Objects;

public class CompareUtilities {
    public static<T> boolean any(T toCompare, T... values) {
        for (T value : values)
            if(Objects.equals(toCompare, value))
                return true;

        return false;
    }

    public static<T> boolean all(T toCompare, T... values) {
        for (T value : values)
            if(!Objects.equals(toCompare, value))
                return false;

        return true;
    }
}
