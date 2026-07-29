package com.pdfworkspace.service;

import com.pdfworkspace.exception.PdfWorkspaceException;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.JPEGFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@Service
public class PdfCompressionService {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompressionResult {
        private long originalSize;
        private long compressedSize;
        private double reductionPercent;
    }

    public CompressionResult compressPdf(Path inputPdfPath, String preset, Path outputPath) {
        float jpegQuality = switch (preset.toLowerCase()) {
            case "low" -> 0.80f;
            case "high" -> 0.30f;
            default -> 0.50f; // recommended
        };

        try {
            long originalSize = Files.size(inputPdfPath);

            try (PDDocument document = Loader.loadPDF(inputPdfPath.toFile())) {
                for (PDPage page : document.getPages()) {
                    PDResources resources = page.getResources();
                    if (resources == null) continue;

                    for (COSName name : resources.getXObjectNames()) {
                        PDXObject xobject = resources.getXObject(name);
                        if (xobject instanceof PDImageXObject pdImage) {
                            try {
                                BufferedImage bImage = pdImage.getImage();
                                if (bImage != null) {
                                    PDImageXObject newImage = JPEGFactory.createFromImage(document, bImage, jpegQuality);
                                    resources.put(name, newImage);
                                }
                            } catch (Exception e) {
                                log.warn("Could not re-compress image object: {}", name.getName(), e);
                            }
                        }
                    }
                }
                document.save(outputPath.toFile());
            }

            long compressedSize = Files.size(outputPath);
            double reductionPercent = Math.max(0.0, ((double) (originalSize - compressedSize) / originalSize) * 100.0);

            log.info("PDF Compressed. Preset: {}, Original: {} bytes, Compressed: {} bytes, Saved: {}%",
                    preset, originalSize, compressedSize, String.format("%.2f", reductionPercent));

            return new CompressionResult(originalSize, compressedSize, Math.round(reductionPercent * 10.0) / 10.0);

        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "compress");
        } catch (PdfWorkspaceException pwe) {
            throw pwe;
        } catch (Exception e) {
            log.error("Failed to compress PDF document", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to compress PDF document.", "compress");
        }
    }
}
