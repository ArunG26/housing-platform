package com.example.housing.market.controller;

import java.nio.charset.StandardCharsets;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.housing.market.dto.MarketAnalysisResponse;
import com.example.housing.market.dto.MarketFilterQuery;
import com.example.housing.market.dto.PagedPropertiesResponse;
import com.example.housing.market.dto.WhatIfRequest;
import com.example.housing.market.dto.WhatIfResponse;
import com.example.housing.market.service.ExportService;
import com.example.housing.market.service.MarketAnalysisService;
import com.example.housing.market.service.MlClient;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/market")
public class MarketController {
    private final MarketAnalysisService marketService;
    private final MlClient mlClient;
    private final ExportService exportService;

    public MarketController(MarketAnalysisService marketService, MlClient mlClient, ExportService exportService) {
        this.marketService = marketService;
        this.mlClient = mlClient;
        this.exportService = exportService;
    }

    @GetMapping("/analysis")
    public MarketAnalysisResponse analysis(@ModelAttribute MarketFilterQuery query) {
        return marketService.analyze(query.toFilter());
    }

    @GetMapping("/properties")
    public PagedPropertiesResponse properties(
            @ModelAttribute MarketFilterQuery query,
            @RequestParam(defaultValue = "price") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return marketService.properties(query.toFilter(), sortBy, direction, page, size);
    }

    @PostMapping("/what-if")
    public WhatIfResponse whatIf(@Valid @RequestBody WhatIfRequest request) {
        return mlClient.compare(request);
    }

    @GetMapping(value = "/export/csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportCsv(@ModelAttribute MarketFilterQuery query) {
        byte[] bytes = exportService.toCsv(marketService.filtered(query.toFilter()));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("market-analysis.csv", StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }

    @GetMapping(value = "/export/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportPdf(@ModelAttribute MarketFilterQuery query) {
        byte[] bytes = exportService.toPdf(marketService.filtered(query.toFilter()));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("market-analysis.pdf").build().toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(bytes);
    }
}
