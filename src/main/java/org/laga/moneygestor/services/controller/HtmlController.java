package org.laga.moneygestor.services.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class HtmlController {

    @RequestMapping(value = "/{page1:^[A-Za-z]*$}")
    public String requestPage(@PathVariable("page1") String page1) {
        return "/" + page1 + ".html";
    }

    @RequestMapping(value = "/{page1:^[A-Za-z]*$}/{page2:^[A-Za-z]*$}")
    public String requestPage(@PathVariable("page1") String page1, @PathVariable("page2") String page2) {
        return "/" + page1 + "/" + page2 + ".html";
    }

    @RequestMapping(value = "/{page1:^[A-Za-z]*$}/{page2:^[A-Za-z]*$}/{page3:^[A-Za-z]*$}")
    public String requestPage(@PathVariable("page1") String page1, @PathVariable("page2") String page2, @PathVariable("page3") String page3) {
        return "/" + page1 + "/" + page2 + "/" + page3 + ".html";
    }

    @RequestMapping(value = "/{page1:^[A-Za-z]*$}/{page2:^[A-Za-z]*$}/{page3:^[A-Za-z]*$}/{page4:^[A-Za-z]*$}")
    public String requestPage(@PathVariable("page1") String page1, @PathVariable("page2") String page2, @PathVariable("page3") String page3, @PathVariable("page4") String page4) {
        return "/" + page1 + "/" + page2 + "/" + page3 + "/" + page4 + ".html";
    }
}
