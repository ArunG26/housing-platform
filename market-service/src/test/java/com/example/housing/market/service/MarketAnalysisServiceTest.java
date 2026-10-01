package com.example.housing.market.service;

import com.example.housing.market.model.MarketFilter;
import com.example.housing.market.repository.HousingDataRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MarketAnalysisServiceTest {

    private final MarketAnalysisService service = new MarketAnalysisService(new HousingDataRepository());
    private final MarketFilter noFilter = new MarketFilter(null, null, null, null, null, null, null, null);

    @Test
    void computesStatisticsForWholeDataset() {
        var result = service.analyze(noFilter);

        assertThat(result.propertyCount()).isEqualTo(50);
        assertThat(result.minimumPrice()).isGreaterThan(0);
        assertThat(result.maximumPrice()).isGreaterThan(result.minimumPrice());
        assertThat(result.byBedrooms()).isNotEmpty();
    }

    @Test
    void filtersByBedroomsAndSchoolRating() {
        var filter = new MarketFilter(null, null, 4, null, null, null, 8.5, null);
        var page = service.properties(filter, "price", "asc", 0, 100);

        assertThat(page.content())
                .allSatisfy(property -> {
                    assertThat(property.bedrooms()).isEqualTo(4);
                    assertThat(property.schoolRating()).isGreaterThanOrEqualTo(8.5);
                });
    }

    @Test
    void sortsAndPaginatesWithoutLosingTotalCount() {
        var page = service.properties(noFilter, "price", "desc", 0, 10);

        assertThat(page.content()).hasSize(10);
        assertThat(page.totalElements()).isEqualTo(50);
        assertThat(page.totalPages()).isEqualTo(5);
        assertThat(page.content().get(0).price()).isGreaterThanOrEqualTo(page.content().get(1).price());
    }

    @Test
    void rejectsUnboundedPageSize() {
        assertThatThrownBy(() -> service.properties(noFilter, "price", "asc", 0, 101))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("size must be between 1 and 100");
    }
}
