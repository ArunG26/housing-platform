package com.example.housing.market.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;

public record HousingFeaturesDto(
        @JsonProperty("square_footage") @Positive double squareFootage,
        @JsonProperty("bedrooms") @Min(0) @Max(20) int bedrooms,
        @JsonProperty("bathrooms") @Positive double bathrooms,
        @JsonProperty("year_built") @Min(1800) @Max(2100) int yearBuilt,
        @JsonProperty("lot_size") @Positive double lotSize,
        @JsonProperty("distance_to_city_center") @DecimalMin("0.0") double distanceToCityCenter,
        @JsonProperty("school_rating") @DecimalMin("0.0") @DecimalMax("10.0") double schoolRating) {
}
