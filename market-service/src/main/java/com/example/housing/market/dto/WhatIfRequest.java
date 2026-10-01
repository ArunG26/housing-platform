package com.example.housing.market.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record WhatIfRequest(
        @NotNull @Valid HousingFeaturesDto baseline,
        @NotNull @Valid HousingFeaturesDto scenario) {
}
