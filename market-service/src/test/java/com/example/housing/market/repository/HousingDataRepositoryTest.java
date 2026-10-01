package com.example.housing.market.repository;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HousingDataRepositoryTest {

    @Test
    void loadsDatasetAndHandlesUtf8Bom() {
        var repository = new HousingDataRepository();

        assertThat(repository.findAll()).hasSize(50);
        assertThat(repository.findAll().getFirst().id()).isPositive();
        assertThat(repository.findAll().getFirst().squareFootage()).isPositive();
    }
}
