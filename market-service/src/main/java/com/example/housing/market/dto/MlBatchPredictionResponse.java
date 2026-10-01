package com.example.housing.market.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record MlBatchPredictionResponse(
        List<Double> predictions,
        @JsonProperty("model_version") String modelVersion) {
}
