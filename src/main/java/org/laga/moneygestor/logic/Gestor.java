package org.laga.moneygestor.logic;

import org.laga.moneygestor.db.entity.UserDb;

import java.util.List;

public interface Gestor<ID, T> {
    /**
     * Insert new object in the database
     * @param object new object to add
     * @return return id of object inserted, <code>null</code> if object not have auto increment id
     */
    ID insert(UserDb userLogged, T object);

    /**
     * Delete object in the database
     * @param id id of object to delete
     */
    default void deleteById(UserDb userLogged, ID id) {
        deleteById(userLogged, id, false);
    }

    /**
     * Delete object in the database
     * @param id id of object to delete
     * @param forceDelete if <code>true</code> delete object although there are other object connected, <code>false</code> throw excepion
     */
    void deleteById(UserDb userLogged, ID id, boolean forceDelete);

    /**
     * Update object in database, where id to update is take by object
     * @param newObject new object
     */
    void update(UserDb userLogged, T newObject);

    /**
     * Update object in database
     * @param id id of object to update
     * @param newObject new object
     */
    void update(UserDb userLogged, ID id, T newObject);

    /**
     * Search object in the database by id
     * @param id id of object to find
     * @return the object found, or <code>null</code> if object not found
     */
    T getById(UserDb userLogged, ID id);

    List<T> getAll(UserDb userLogged);
}
