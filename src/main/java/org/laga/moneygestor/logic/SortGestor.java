package org.laga.moneygestor.logic;

import org.springframework.data.domain.Sort;

public class SortGestor {
    private final static char DESCEND = '!';
    private final static String MULTIPLE_SORT_REGEX = "#";


    /**
     * This function decode a sort string pass in URL with follow code:<br>
     * <code>[!]ATTRIBUTE_NAME(+[!]ATTRIBUTE_NAME)*</code>
     */
    public static Sort decode(String sortString) {
        if(sortString == null)
            return Sort.unsorted();

        String[] sortSplit = sortString.split(MULTIPLE_SORT_REGEX);
        Sort.Order[] orders = new Sort.Order[sortSplit.length];

        int i = 0;
        for(var sortElement : sortSplit) {
            orders[i++] = sortElement.charAt(0) == '!'? new Sort.Order(Sort.Direction.DESC, sortElement.substring(1)) : new Sort.Order(Sort.Direction.ASC, sortElement);
        }

        return Sort.by(orders);
    }

    public static String toSql(String sortString) {
        if(sortString == null || sortString.trim().length() == 0)
            return "";

        String[] sortSplit = sortString.split(MULTIPLE_SORT_REGEX);
        StringBuilder sqlOrderBy = new StringBuilder("ORDER BY ");

        for(int i = 0; i < sortSplit.length; i++) {
            String sortElement = sortSplit[i];
            sqlOrderBy.append(sortElement.substring(sortElement.charAt(0) == DESCEND? 1 : 0))
                    .append(sortElement.charAt(0) == DESCEND? " DESC" : " ASC");

            if(i < sortSplit.length - 1)
                sqlOrderBy.append(", ");
        }

        return sqlOrderBy.toString();
    }
}
