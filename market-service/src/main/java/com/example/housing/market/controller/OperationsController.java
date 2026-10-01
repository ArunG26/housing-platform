package com.example.housing.market.controller;

import com.example.housing.market.service.MarketAnalysisService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class OperationsController {
    private final MarketAnalysisService marketService;
    private final String serviceVersion;
    private final String platformVersion;

    public OperationsController(
            MarketAnalysisService marketService,
            @Value("${spring.application.version}") String serviceVersion,
            @Value("${platform.version}") String platformVersion) {
        this.marketService = marketService;
        this.serviceVersion = serviceVersion;
        this.platformVersion = platformVersion;
    }

    @GetMapping({"/health", "/api/v1/market/health"})
    public Map<String, Object> ready() {
        return Map.of("status", "healthy", "dataset_loaded", marketService.datasetSize() > 0, "dataset_rows", marketService.datasetSize());
    }

    @GetMapping("/version")
    public Map<String, String> version() {
        return Map.of(
                "service", "market-service",
                "service_version", serviceVersion,
                "platform_version", platformVersion,
                "api_version", "v1");
    }
}
