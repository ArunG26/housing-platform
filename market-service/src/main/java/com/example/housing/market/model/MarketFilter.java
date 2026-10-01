package com.example.housing.market.model;

public record MarketFilter(
        Double minPrice,
        Double maxPrice,
        Integer bedrooms,
        Double minBathrooms,
        Double minSquareFootage,
        Double maxSquareFootage,
        Double minSchoolRating,
        Double maxDistance) {

    public MarketFilter {
        if (minPrice != null && minPrice < 0) throw new IllegalArgumentException("minPrice must be non-negative");
        if (maxPrice != null && maxPrice < 0) throw new IllegalArgumentException("maxPrice must be non-negative");
        if (bedrooms != null && bedrooms < 0) throw new IllegalArgumentException("bedrooms must be non-negative");
        if (minBathrooms != null && minBathrooms < 0) throw new IllegalArgumentException("minBathrooms must be non-negative");
        if (minSquareFootage != null && minSquareFootage < 0) throw new IllegalArgumentException("minSquareFootage must be non-negative");
        if (maxSquareFootage != null && maxSquareFootage < 0) throw new IllegalArgumentException("maxSquareFootage must be non-negative");
        if (minSchoolRating != null && (minSchoolRating < 0 || minSchoolRating > 10)) {
            throw new IllegalArgumentException("minSchoolRating must be between 0 and 10");
        }
        if (maxDistance != null && maxDistance < 0) throw new IllegalArgumentException("maxDistance must be non-negative");
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new IllegalArgumentException("minPrice cannot exceed maxPrice");
        }
        if (minSquareFootage != null && maxSquareFootage != null && minSquareFootage > maxSquareFootage) {
            throw new IllegalArgumentException("minSquareFootage cannot exceed maxSquareFootage");
        }
    }

    public boolean matches(PropertyRecord property) {
        return (minPrice == null || property.price() >= minPrice)
                && (maxPrice == null || property.price() <= maxPrice)
                && (bedrooms == null || property.bedrooms() == bedrooms)
                && (minBathrooms == null || property.bathrooms() >= minBathrooms)
                && (minSquareFootage == null || property.squareFootage() >= minSquareFootage)
                && (maxSquareFootage == null || property.squareFootage() <= maxSquareFootage)
                && (minSchoolRating == null || property.schoolRating() >= minSchoolRating)
                && (maxDistance == null || property.distanceToCityCenter() <= maxDistance);
    }

    public String cacheKey() {
        return String.join("|",
                String.valueOf(minPrice), String.valueOf(maxPrice), String.valueOf(bedrooms),
                String.valueOf(minBathrooms), String.valueOf(minSquareFootage), String.valueOf(maxSquareFootage),
                String.valueOf(minSchoolRating), String.valueOf(maxDistance));
    }
}
