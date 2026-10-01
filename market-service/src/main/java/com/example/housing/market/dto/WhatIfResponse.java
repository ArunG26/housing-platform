package com.example.housing.market.dto;

public record WhatIfResponse(
        double baselinePrediction,
        double scenarioPrediction,
        double absoluteChange,
        double percentageChange,
        String modelVersion) {
}
