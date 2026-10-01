package com.example.housing.market.model;

public record PropertyRecord(
        long id,
        double squareFootage,
        int bedrooms,
        double bathrooms,
        int yearBuilt,
        double lotSize,
        double distanceToCityCenter,
        double schoolRating,
        double price) {
}
