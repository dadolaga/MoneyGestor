package org.laga.moneygestor.services;

import org.laga.moneygestor.db.repository.ColorRepository;
import org.laga.moneygestor.logic.ColorGestor;
import org.laga.moneygestor.services.json.Color;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/color")
public class ColorRest {

    private final ColorRepository colorRepository;

    @Autowired
    public ColorRest(ColorRepository colorRepository) {
        this.colorRepository = colorRepository;
    }

    @GetMapping("/list")
    public List<Color> getColorList() {
        return ColorGestor.convertToRest(colorRepository.findAll());
    }
}
