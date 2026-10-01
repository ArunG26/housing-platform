package com.example.housing.market.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.example.housing.market.dto.MarketAnalysisResponse;
import com.example.housing.market.dto.PagedPropertiesResponse;
import com.example.housing.market.model.MarketFilter;
import com.example.housing.market.model.PropertyRecord;
import com.example.housing.market.repository.HousingDataRepository;

@Service
public class MarketAnalysisService {
    private static final double PRICE_BUCKET_SIZE = 50_000.0;
    private final HousingDataRepository repository;

    public MarketAnalysisService(HousingDataRepository repository) {
        this.repository = repository;
    }

    @Cacheable(cacheNames = "marketAnalysis", key = "#p0.cacheKey()")
    public MarketAnalysisResponse analyze(MarketFilter filter) {
        List<PropertyRecord> properties = filtered(filter);
        if (properties.isEmpty()) {
            return new MarketAnalysisResponse(0, 0, 0, 0, 0, 0, 0, 0, List.of(), List.of());
        }

        var prices = properties.stream().map(PropertyRecord::price).sorted().toList();
        double averagePrice = prices.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double medianPrice = median(prices);
        double minPrice = prices.getFirst();
        double maxPrice = prices.getLast();

        var byBedrooms = properties.stream()
                .collect(Collectors.groupingBy(PropertyRecord::bedrooms))
                .entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new MarketAnalysisResponse.BedroomSegment(
                        entry.getKey(),
                        entry.getValue().size(),
                        entry.getValue().stream().mapToDouble(PropertyRecord::price).average().orElse(0)))
                .toList();

        Map<Double, Long> bucketCounts = properties.stream()
                .collect(Collectors.groupingBy(
                        property -> Math.floor(property.price() / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE,
                        Collectors.counting()));

        var distribution = bucketCounts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new MarketAnalysisResponse.PriceBucket(
                        entry.getKey(), entry.getKey() + PRICE_BUCKET_SIZE, entry.getValue().intValue()))
                .toList();

        return new MarketAnalysisResponse(
                properties.size(),
                averagePrice,
                medianPrice,
                minPrice,
                maxPrice,
                properties.stream().mapToDouble(PropertyRecord::squareFootage).average().orElse(0),
                properties.stream().mapToDouble(PropertyRecord::schoolRating).average().orElse(0),
                properties.stream().mapToDouble(PropertyRecord::distanceToCityCenter).average().orElse(0),
                byBedrooms,
                distribution);
    }

    public PagedPropertiesResponse properties(
            MarketFilter filter, String sortBy, String direction, int page, int size) {
        if (page < 0) throw new IllegalArgumentException("page must be non-negative");
        if (size < 1 || size > 100) throw new IllegalArgumentException("size must be between 1 and 100");

        var properties = new ArrayList<>(filtered(filter));
        Comparator<PropertyRecord> comparator = comparatorFor(sortBy);
        if ("desc".equalsIgnoreCase(direction)) comparator = comparator.reversed();
        else if (!"asc".equalsIgnoreCase(direction)) throw new IllegalArgumentException("direction must be asc or desc");
        properties.sort(comparator);

        int total = properties.size();
        int from = Math.min(page * size, total);
        int to = Math.min(from + size, total);
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);

        return new PagedPropertiesResponse(
                List.copyOf(properties.subList(from, to)), page, size, total, totalPages);
    }

    public int datasetSize() {
        return repository.findAll().size();
    }

    public List<PropertyRecord> filtered(MarketFilter filter) {
        return repository.findAll().stream().filter(filter::matches).toList();
    }

    private Comparator<PropertyRecord> comparatorFor(String sortBy) {
        return switch (sortBy == null ? "price" : sortBy) {
            case "id" -> Comparator.comparingLong(PropertyRecord::id);
            case "price" -> Comparator.comparingDouble(PropertyRecord::price);
            case "squareFootage" -> Comparator.comparingDouble(PropertyRecord::squareFootage);
            case "bedrooms" -> Comparator.comparingInt(PropertyRecord::bedrooms);
            case "bathrooms" -> Comparator.comparingDouble(PropertyRecord::bathrooms);
            case "yearBuilt" -> Comparator.comparingInt(PropertyRecord::yearBuilt);
            case "schoolRating" -> Comparator.comparingDouble(PropertyRecord::schoolRating);
            case "distanceToCityCenter" -> Comparator.comparingDouble(PropertyRecord::distanceToCityCenter);
            default -> throw new IllegalArgumentException("Unsupported sortBy field: " + sortBy);
        };
    }

    private double median(List<Double> sorted) {
        int size = sorted.size();
        if (size % 2 == 1) return sorted.get(size / 2);
        return (sorted.get(size / 2 - 1) + sorted.get(size / 2)) / 2.0;
    }
}
