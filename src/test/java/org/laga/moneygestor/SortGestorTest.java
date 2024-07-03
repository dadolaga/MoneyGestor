package org.laga.moneygestor;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.logic.SortGestor;

public class SortGestorTest {
    @Test
    public void toSql_singleAttributeAsc() {
        final String sortParams = "att1";
        final String expected = "ORDER BY att1 ASC";

        Assertions.assertEquals(expected, SortGestor.toSql(sortParams));
    }

    @Test
    public void toSql_singleAttributeDesc() {
        final String sortParams = "!att1";
        final String expected = "ORDER BY att1 DESC";

        Assertions.assertEquals(expected, SortGestor.toSql(sortParams));
    }

    @Test
    public void toSql_doubleAttributeAsc() {
        final String sortParams = "att1+att2";
        final String expected = "ORDER BY att1 ASC, att2 ASC";

        Assertions.assertEquals(expected, SortGestor.toSql(sortParams));
    }

    @Test
    public void toSql_doubleAttributeDesc() {
        final String sortParams = "!att1+!att2";
        final String expected = "ORDER BY att1 DESC, att2 DESC";

        Assertions.assertEquals(expected, SortGestor.toSql(sortParams));
    }

    @Test
    public void toSql_doubleAttributeMulti1() {
        final String sortParams = "!att1+att2";
        final String expected = "ORDER BY att1 DESC, att2 ASC";

        Assertions.assertEquals(expected, SortGestor.toSql(sortParams));
    }

    @Test
    public void toSql_doubleAttributeMulti2() {
        final String sortParams = "att1+!att2";
        final String expected = "ORDER BY att1 ASC, att2 DESC";

        Assertions.assertEquals(expected, SortGestor.toSql(sortParams));
    }
}
