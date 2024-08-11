package org.laga.moneygestor.logic;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.function.Executable;
import org.laga.moneygestor.db.entity.UserDb;

import java.util.LinkedList;
import java.util.List;

public class GestorBaseUtilitiesTest<ID, T> {

    private final Gestor<ID, T> gestor;
    private final UserDb userLogged;
    private final T object;
    private final ID id;

    public GestorBaseUtilitiesTest(Gestor<ID, T> gestor, UserDb userLogged, T object, ID id) {
        this.gestor = gestor;
        this.userLogged = userLogged;
        this.object = object;
        this.id = id;
    }

    public void executeTest() {
        LinkedList<Executable> listOfExecutable = new LinkedList<>();

        testInsert(listOfExecutable);
        testDelete(listOfExecutable);
        testUpdate(listOfExecutable);
        testGetById(listOfExecutable);
        testGetAll(listOfExecutable);

        Assertions.assertAll(listOfExecutable);
    }

    private void testInsert(List<Executable> listOfAssert) {
        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.insert(null, object), "insert - user null - fail"));

        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.insert(userLogged, null), "insert - object null - fail"));
    }

    private void testDelete(List<Executable> listOfAssert) {
        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.deleteById(null, id), "delete - user null - fail"));

        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.deleteById(userLogged, null), "update - id null - fail"));
    }

    private void testUpdate(List<Executable> listOfAssert) {
        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.update(null, object), "update only ID - user null - fail"));

        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.update(userLogged, null), "update only ID - id null - fail"));

        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.update(null, id, object), "update - user null - fail"));

        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.update(userLogged, null, object), "update - id null - fail"));

        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.update(userLogged, id, null), "update - object null - fail"));
    }

    private void testGetById(List<Executable> listOfAssert) {
        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.getById(null, id), "get - user null - fail"));

        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.getById(userLogged, null), "get - id null - fail"));
    }

    private void testGetAll(List<Executable> listOfAssert) {
        listOfAssert.add(() -> Assertions.assertThrows(IllegalArgumentException.class, () -> gestor.getAll(null), "get - user null - fail"));
    }
}
