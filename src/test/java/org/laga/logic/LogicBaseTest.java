package org.laga.logic;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.runner.RunWith;
import org.laga.moneygestor.App;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

@Disabled
@RunWith(SpringRunner.class)
@SpringBootTest(classes = App.class)
public abstract class LogicBaseTest {
    protected SessionFactory sessionFactory;

    @Autowired
    private EntityManagerFactory managerFactory;

    @BeforeEach
    public void initializeFactory() {
        if(managerFactory.unwrap(SessionFactory.class) == null){
            throw new NullPointerException("factory is not a hibernate factory");
        }

        sessionFactory = managerFactory.unwrap(SessionFactory.class);
    }
}
