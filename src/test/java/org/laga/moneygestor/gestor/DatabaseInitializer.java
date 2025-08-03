package org.laga.moneygestor.gestor;

import org.hibernate.SessionFactory;
import org.hibernate.boot.model.naming.Identifier;
import org.hibernate.boot.model.naming.PhysicalNamingStrategy;
import org.hibernate.cfg.Configuration;
import org.hibernate.engine.jdbc.env.spi.JdbcEnvironment;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.laga.moneygestor.db.entity.*;

public abstract class DatabaseInitializer {
    public static SessionFactory sessionFactory;

    @BeforeAll
    public static void setUp() throws Exception {
        Configuration configuration = new Configuration();
        configuration.setProperty("hibernate.connection.driver_class", "org.h2.Driver");
        configuration.setProperty("hibernate.connection.url", "jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1");
        configuration.setProperty("hibernate.connection.username", "sa");
        configuration.setProperty("hibernate.connection.password", "");
        configuration.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        configuration.setProperty("hibernate.show_sql", "true");

        configuration.addAnnotatedClass(ColorDb.class);
        configuration.addAnnotatedClass(LoginDb.class);
        configuration.addAnnotatedClass(StockDb.class);
        configuration.addAnnotatedClass(StockOperationDb.class);
        configuration.addAnnotatedClass(TransactionDb.class);
        configuration.addAnnotatedClass(TransactionTypeDb.class);
        configuration.addAnnotatedClass(UserDb.class);
        configuration.addAnnotatedClass(WalletDb.class);

        configuration.setPhysicalNamingStrategy(new PhysicalNamingStrategy() {
            @Override
            public Identifier toPhysicalCatalogName(Identifier identifier, JdbcEnvironment jdbcEnvironment) {
                return identifier;
            }

            @Override
            public Identifier toPhysicalSchemaName(Identifier identifier, JdbcEnvironment jdbcEnvironment) {
                return identifier;
            }

            @Override
            public Identifier toPhysicalTableName(Identifier name, JdbcEnvironment jdbcEnvironment) {
                if (name.getText().equals("user")) {
                    return new Identifier(name.getText(), true);
                }
                return name;
            }

            @Override
            public Identifier toPhysicalSequenceName(Identifier identifier, JdbcEnvironment jdbcEnvironment) {
                return identifier;
            }

            @Override
            public Identifier toPhysicalColumnName(Identifier identifier, JdbcEnvironment jdbcEnvironment) {
                if (identifier.getText().equals("user") || identifier.getText().equals("value")) {
                    return new Identifier(identifier.getText(), true);
                }

                return identifier;
            }
        });

        sessionFactory = configuration.buildSessionFactory();

        var databaseInitializer = new org.laga.moneygestor.db.DatabaseInitializer(sessionFactory);

        try {
            databaseInitializer.run();
        } catch (Exception ex) {
            Assertions.fail(ex);
        }
    }

    @AfterEach
    public void clear() {
        try (var session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            session.createMutationQuery("DELETE FROM LoginDb").executeUpdate();
            session.createMutationQuery("DELETE FROM StockOperationDb").executeUpdate();
            session.createMutationQuery("DELETE FROM StockDb").executeUpdate();
            session.createMutationQuery("DELETE FROM TransactionDb").executeUpdate();
            session.createMutationQuery("DELETE FROM UserDb").executeUpdate();
            session.createMutationQuery("DELETE FROM WalletDb").executeUpdate();

            transaction.commit();
        } catch (Exception ex) {
            Assertions.fail(ex);
        }
    }

    @AfterAll
    public static void tearDown() {
        if (sessionFactory != null) {
            sessionFactory.close();
        }
    }

    public static<T> void addEntity(T entity) {
        try (var session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            session.persist(entity);

            transaction.commit();
        } catch (Exception ex) {
            Assertions.fail(ex);
        }
    }

    public static<T> T getEntity(Class<T> tClass, Object id) {
        try (var session = sessionFactory.openSession()) {
            return session.get(tClass, id);
        } catch (Exception ex) {
            Assertions.fail(ex);

            return null;
        }
    }
}
