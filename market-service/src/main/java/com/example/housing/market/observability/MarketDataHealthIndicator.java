package com.example.housing.market.observability;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import com.example.housing.market.service.MarketAnalysisService;

@Component("marketData")
public class MarketDataHealthIndicator implements HealthIndicator {

    private final MarketAnalysisService marketService;

    public MarketDataHealthIndicator(MarketAnalysisService marketService) {
        this.marketService = marketService;
    }

    @Override
    public Health health() {
        int dataSetSize = marketService.datasetSize();

        if (dataSetSize > 0) {
            return Health.up()
                    .withDetail("datasetSize", dataSetSize)
                    .build();
        }

        return Health.down()
                .withDetail("datasetSize", dataSetSize)
                .withDetail("reason", "No market data loaded")
                .build();
    }
}