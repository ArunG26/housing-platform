package com.example.housing.market.dto;

import com.example.housing.market.model.PropertyRecord;
import java.util.List;

public record PagedPropertiesResponse(
        List<PropertyRecord> content,
        int page,
        int size,
        int totalElements,
        int totalPages) {
}
