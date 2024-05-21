package org.laga.moneygestor.logic;

import java.util.stream.Stream;

public interface Gestor<ID, T> {
    /**
     * Insert new object in the database
     * @param object new object to add
     * @return return id of object inserted, <code>null</code> if object not have auto increment id
     */
    ID insert(UserGestor userLogged, T object);

    /**
     * Delete object in the database
     * @param id id of object to delete
     */
    default void deleteById(UserGestor userLogged, ID id) {
        deleteById(userLogged, id, false);
    }

    /**
     * Delete object in the database
     * @param id id of object to delete
     * @param forceDelete if <code>true</code> delete object although there are other object connected, <code>false</code> throw excepion
     */
    void deleteById(UserGestor userLogged, ID id, boolean forceDelete);

    /**
     * Update object in database, where id to update is take by object
     * @param newObject new object
     */
    void update(UserGestor userLogged, T newObject);

    /**
     * Update object in database
     * @param id id of object to update
     * @param newObject new object
     */
    void update(UserGestor userLogged, ID id, T newObject);

    /**
     * Search object in the database by id
     * @param id id of object to find
     * @return the object found, or <code>null</code> if object not found
     */
    T getById(UserGestor userLogged, ID id);

    Stream<T> getAll(UserGestor userLogged);
}
