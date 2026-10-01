package com.example.housing.market.repository;

import com.example.housing.market.model.PropertyRecord;
import org.apache.commons.csv.CSVFormat;
import org.springframework.stereotype.Repository;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Repository
public class HousingDataRepository {
    private final List<PropertyRecord> properties;

    public HousingDataRepository() {
        this.properties = loadProperties();
    }

    public List<PropertyRecord> findAll() {
        return properties;
    }

    private List<PropertyRecord> loadProperties() {
        var input = HousingDataRepository.class.getResourceAsStream("/House Price Dataset.csv");
        if (input == null) {
            throw new IllegalStateException("Housing dataset resource was not found");
        }

        try (var reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            // UTF-8 BOM is valid input. Strip it before Commons CSV reads the first header.
            reader.mark(1);
            int firstCharacter = reader.read();
            if (firstCharacter != '\uFEFF') {
                reader.reset();
            }

            var csvFormat = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .get();

            try (var parser = csvFormat.parse(reader)) {
                return parser.stream()
                        .map(row -> new PropertyRecord(
                                Long.parseLong(row.get("id")),
                                Double.parseDouble(row.get("square_footage")),
                                Integer.parseInt(row.get("bedrooms")),
                                Double.parseDouble(row.get("bathrooms")),
                                Integer.parseInt(row.get("year_built")),
                                Double.parseDouble(row.get("lot_size")),
                                Double.parseDouble(row.get("distance_to_city_center")),
                                Double.parseDouble(row.get("school_rating")),
                                Double.parseDouble(row.get("price"))))
                        .toList();
            }
        } catch (IOException | RuntimeException exc) {
            throw new IllegalStateException("Failed to load housing dataset", exc);
        }
    }
}
