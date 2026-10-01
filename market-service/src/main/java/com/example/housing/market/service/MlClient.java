package com.example.housing.market.service;

import com.example.housing.market.dto.MlBatchPredictionResponse;
import com.example.housing.market.dto.WhatIfRequest;
import com.example.housing.market.dto.WhatIfResponse;
import com.example.housing.market.exception.MlServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class MlClient {
    private static final Logger log = LoggerFactory.getLogger(MlClient.class);
    private final RestClient restClient;

    public MlClient(RestClient mlRestClient) {
        this.restClient = mlRestClient;
    }

    public WhatIfResponse compare(WhatIfRequest request) {
        long started = System.nanoTime();
        try {
            var response = restClient.post()
                    .uri("/predict")
                    .body(List.of(request.baseline(), request.scenario()))
                    .retrieve()
                    .body(MlBatchPredictionResponse.class);

            if (response == null || response.predictions() == null || response.predictions().size() != 2) {
                throw new MlServiceException("ML service returned an invalid batch response");
            }

            double baseline = response.predictions().get(0);
            double scenario = response.predictions().get(1);
            double change = scenario - baseline;
            double percentage = baseline == 0 ? 0 : (change / baseline) * 100.0;

            log.atInfo()
                    .addKeyValue("operation", "market_what_if")
                    .addKeyValue("model_version", response.modelVersion())
                    .addKeyValue("duration_ms", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started))
                    .addKeyValue("status", 200)
                    .log("what-if prediction completed");

            return new WhatIfResponse(
                    baseline, scenario, change, percentage, response.modelVersion());
        } catch (RestClientException exc) {
            log.atError()
                    .addKeyValue("operation", "market_what_if")
                    .addKeyValue("duration_ms", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started))
                    .addKeyValue("status", 503)
                    .log("ML prediction failed");
            throw new MlServiceException("ML prediction service is unavailable", exc);
        }
    }
}
