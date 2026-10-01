package com.example.housing.market.service;

import com.example.housing.market.model.PropertyRecord;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

@Service
public class ExportService {
    private static final int PDF_ROWS_PER_PAGE = 28;

    public byte[] toCsv(List<PropertyRecord> properties) {
        var csv = new StringBuilder("id,square_footage,bedrooms,bathrooms,year_built,lot_size,distance_to_city_center,school_rating,price\n");
        for (var p : properties) {
            csv.append(String.format(Locale.US, "%d,%.0f,%d,%.1f,%d,%.0f,%.1f,%.1f,%.2f%n",
                    p.id(), p.squareFootage(), p.bedrooms(), p.bathrooms(), p.yearBuilt(), p.lotSize(),
                    p.distanceToCityCenter(), p.schoolRating(), p.price()));
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] toPdf(List<PropertyRecord> properties) {
        try (var document = new PDDocument(); var output = new ByteArrayOutputStream()) {
            if (properties.isEmpty()) {
                renderPage(document, List.of(), 1, 1);
            } else {
                int pages = (int) Math.ceil((double) properties.size() / PDF_ROWS_PER_PAGE);
                for (int page = 0; page < pages; page++) {
                    int from = page * PDF_ROWS_PER_PAGE;
                    int to = Math.min(from + PDF_ROWS_PER_PAGE, properties.size());
                    renderPage(document, properties.subList(from, to), page + 1, pages);
                }
            }
            document.save(output);
            return output.toByteArray();
        } catch (IOException exc) {
            throw new IllegalStateException("Failed to create PDF export", exc);
        }
    }

    private void renderPage(PDDocument document, List<PropertyRecord> rows, int pageNumber, int totalPages) throws IOException {
        var landscape = new PDRectangle(PDRectangle.LETTER.getHeight(), PDRectangle.LETTER.getWidth());
        var page = new PDPage(landscape);
        document.addPage(page);
        var regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

        try (var content = new PDPageContentStream(document, page)) {
            float y = 560;
            content.beginText();
            content.setFont(bold, 14);
            content.newLineAtOffset(36, y);
            content.showText("Property Market Export");
            content.endText();

            y -= 24;
            content.beginText();
            content.setFont(bold, 7);
            content.newLineAtOffset(36, y);
            content.showText(String.format("%-4s %-7s %-5s %-5s %-6s %-8s %-8s %-7s %-10s",
                    "ID", "SqFt", "Beds", "Bath", "Year", "Lot", "Dist", "School", "Price"));
            content.endText();

            for (var p : rows) {
                y -= 16;
                content.beginText();
                content.setFont(regular, 7);
                content.newLineAtOffset(36, y);
                content.showText(String.format(Locale.US, "%-4d %-7.0f %-5d %-5.1f %-6d %-8.0f %-8.1f %-7.1f %-10.0f",
                        p.id(), p.squareFootage(), p.bedrooms(), p.bathrooms(), p.yearBuilt(), p.lotSize(),
                        p.distanceToCityCenter(), p.schoolRating(), p.price()));
                content.endText();
            }

            content.beginText();
            content.setFont(regular, 7);
            content.newLineAtOffset(700, 20);
            content.showText("Page " + pageNumber + " / " + totalPages);
            content.endText();
        }
    }
}
