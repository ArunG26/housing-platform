package com.example.housing.market.dto;

import java.util.List;

public record MarketAnalysisResponse(
        int propertyCount,
        double averagePrice,
        double medianPrice,
        double minimumPrice,
        double maximumPrice,
        double averageSquareFootage,
        double averageSchoolRating,
        double averageDistanceToCityCenter,
        List<BedroomSegment> byBedrooms,
        List<PriceBucket> priceDistribution) {

    public record BedroomSegment(int bedrooms, int propertyCount, double averagePrice) {
    }

    public record PriceBucket(double lowerBound, double upperBound, int propertyCount) {
    }
}
