package org.laga.moneygestor.services;

import org.laga.moneygestor.db.entity.User;
import org.laga.moneygestor.db.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
public class HelloWorld {
    private static final Logger logger = LoggerFactory.getLogger(HelloWorld.class);
    private UserRepository userRepository;

    @Autowired
    public HelloWorld(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/hello")
    public String helloWorld() throws Exception {
        System.out.println("ciao");
        return "Hello world";
    }

    @GetMapping("/user")
    public User helloWorldUser() {
        return userRepository.findUsersFromUsername("dadolaga");
    }

}
