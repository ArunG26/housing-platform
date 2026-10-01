package com.example.housing.market.dto;

import com.example.housing.market.model.MarketFilter;

public class MarketFilterQuery {
    private Double minPrice;
    private Double maxPrice;
    private Integer bedrooms;
    private Double minBathrooms;
    private Double minSquareFootage;
    private Double maxSquareFootage;
    private Double minSchoolRating;
    private Double maxDistance;

    public Double getMinPrice() { return minPrice; }
    public void setMinPrice(Double minPrice) { this.minPrice = minPrice; }
    public Double getMaxPrice() { return maxPrice; }
    public void setMaxPrice(Double maxPrice) { this.maxPrice = maxPrice; }
    public Integer getBedrooms() { return bedrooms; }
    public void setBedrooms(Integer bedrooms) { this.bedrooms = bedrooms; }
    public Double getMinBathrooms() { return minBathrooms; }
    public void setMinBathrooms(Double minBathrooms) { this.minBathrooms = minBathrooms; }
    public Double getMinSquareFootage() { return minSquareFootage; }
    public void setMinSquareFootage(Double minSquareFootage) { this.minSquareFootage = minSquareFootage; }
    public Double getMaxSquareFootage() { return maxSquareFootage; }
    public void setMaxSquareFootage(Double maxSquareFootage) { this.maxSquareFootage = maxSquareFootage; }
    public Double getMinSchoolRating() { return minSchoolRating; }
    public void setMinSchoolRating(Double minSchoolRating) { this.minSchoolRating = minSchoolRating; }
    public Double getMaxDistance() { return maxDistance; }
    public void setMaxDistance(Double maxDistance) { this.maxDistance = maxDistance; }

    public MarketFilter toFilter() {
        return new MarketFilter(minPrice, maxPrice, bedrooms, minBathrooms, minSquareFootage,
                maxSquareFootage, minSchoolRating, maxDistance);
    }
}
