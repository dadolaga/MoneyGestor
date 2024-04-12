package org.laga.moneygestor.logic;

import org.springframework.data.domain.Sort;

public class SortGestor {

    /**
     * This function decode a sort string pass in URL with follow code:
     * <code>[!]ATTRIBUTE_NAME\[[!]ATTRIBUTE_NAME]*</code>
     * @param sortString
     * @return
     */
    public static Sort decode(String sortString) {
        if(sortString == null)
            return Sort.unsorted();

        final String MULTIPLE_SORT_REGEX = "\\+";

        String[] sortSplit = sortString.split(MULTIPLE_SORT_REGEX);
        Sort.Order[] orders = new Sort.Order[sortSplit.length];

        int i = 0;
        for(var sortElement : sortSplit) {
            orders[i++] = sortElement.charAt(0) == '!'? new Sort.Order(Sort.Direction.DESC, sortElement.substring(1)) : new Sort.Order(Sort.Direction.ASC, sortElement);
        }

        return Sort.by(orders);
    }
}
