package com.pdfworkspace.service;

import com.pdfworkspace.exception.PdfWorkspaceException;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.util.Matrix;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.nio.file.Path;

@Slf4j
@Service
public class PdfAnnotationService {

    /**
     * Apply Text Watermark across document pages with rotation, opacity, and positioning.
     */
    public void applyTextWatermark(Path pdfPath, String text, float opacity, int rotation, float fontSize, String position, Path outputPath) {
        if (text == null || text.isBlank()) {
            throw new PdfWorkspaceException("INVALID_INPUT", "Watermark text cannot be empty.", "watermark");
        }

        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            for (PDPage page : document.getPages()) {
                PDRectangle mediaBox = page.getMediaBox();
                float width = mediaBox.getWidth();
                float height = mediaBox.getHeight();

                float textWidth = (font.getStringWidth(text) / 1000f) * fontSize;
                float textHeight = fontSize;

                float x = (width - textWidth) / 2;
                float y = (height - textHeight) / 2;

                if ("top-left".equalsIgnoreCase(position)) { x = 40; y = height - 60; }
                else if ("top-right".equalsIgnoreCase(position)) { x = width - textWidth - 40; y = height - 60; }
                else if ("bottom-left".equalsIgnoreCase(position)) { x = 40; y = 40; }
                else if ("bottom-right".equalsIgnoreCase(position)) { x = width - textWidth - 40; y = 40; }

                try (PDPageContentStream cs = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
                    gs.setNonStrokingAlphaConstant(opacity);
                    gs.setStrokingAlphaConstant(opacity);
                    cs.setGraphicsStateParameters(gs);

                    cs.setNonStrokingColor(Color.GRAY);
                    cs.beginText();
                    cs.setFont(font, fontSize);
                    cs.setTextMatrix(Matrix.getRotateInstance(Math.toRadians(rotation), x, y));
                    cs.showText(text);
                    cs.endText();
                }
            }

            document.save(outputPath.toFile());
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "watermark");
        } catch (Exception e) {
            log.error("Failed to apply text watermark", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to apply text watermark.", "watermark");
        }
    }

    /**
     * Apply Image Watermark across document pages.
     */
    public void applyImageWatermark(Path pdfPath, Path imagePath, float opacity, int rotation, String position, Path outputPath) {
        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            PDImageXObject pdImage = PDImageXObject.createFromFileByContent(imagePath.toFile(), document);

            for (PDPage page : document.getPages()) {
                PDRectangle mediaBox = page.getMediaBox();
                float width = mediaBox.getWidth();
                float height = mediaBox.getHeight();

                float imgW = Math.min(pdImage.getWidth(), width * 0.4f);
                float imgH = (pdImage.getHeight() / (float) pdImage.getWidth()) * imgW;

                float x = (width - imgW) / 2;
                float y = (height - imgH) / 2;

                try (PDPageContentStream cs = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
                    gs.setNonStrokingAlphaConstant(opacity);
                    cs.setGraphicsStateParameters(gs);

                    cs.drawImage(pdImage, x, y, imgW, imgH);
                }
            }

            document.save(outputPath.toFile());
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "watermark");
        } catch (Exception e) {
            log.error("Failed to apply image watermark", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to apply image watermark.", "watermark");
        }
    }

    /**
     * Add header or footer page numbers across document pages.
     */
    public void addPageNumbers(Path pdfPath, String position, String alignment, String format, float fontSize, Path outputPath) {
        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            int totalPages = document.getNumberOfPages();
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            String pattern = (format != null && !format.isBlank()) ? format : "Page {n} of {total}";

            for (int i = 0; i < totalPages; i++) {
                PDPage page = document.getPage(i);
                PDRectangle mediaBox = page.getMediaBox();
                float width = mediaBox.getWidth();
                float height = mediaBox.getHeight();

                String label = pattern.replace("{n}", String.valueOf(i + 1))
                                       .replace("{total}", String.valueOf(totalPages));

                float textWidth = (font.getStringWidth(label) / 1000f) * fontSize;

                float x = (width - textWidth) / 2; // default center
                if ("left".equalsIgnoreCase(alignment)) x = 40;
                else if ("right".equalsIgnoreCase(alignment)) x = width - textWidth - 40;

                boolean isHeader = "header".equalsIgnoreCase(position);
                float y = isHeader ? height - 35 : 30;

                try (PDPageContentStream cs = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    cs.beginText();
                    cs.setFont(font, fontSize);
                    cs.setNonStrokingColor(Color.DARK_GRAY);
                    cs.newLineAtOffset(x, y);
                    cs.showText(label);
                    cs.endText();
                }
            }

            document.save(outputPath.toFile());
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "page-numbers");
        } catch (Exception e) {
            log.error("Failed to add page numbers", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to add page numbers to PDF.", "page-numbers");
        }
    }

    /**
     * Draw signature image onto specified PDF page at coordinates.
     */
    public void signPdf(Path pdfPath, Path signatureImagePath, int pageNum, float x, float y, float width, float height, Path outputPath) {
        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            int totalPages = document.getNumberOfPages();
            int targetIndex = Math.max(0, Math.min(totalPages - 1, pageNum - 1));

            PDPage page = document.getPage(targetIndex);
            PDImageXObject pdImage = PDImageXObject.createFromFileByContent(signatureImagePath.toFile(), document);

            float drawW = (width > 0) ? width : 150;
            float drawH = (height > 0) ? height : (pdImage.getHeight() / (float) pdImage.getWidth()) * drawW;

            float drawX = (x > 0) ? x : 50;
            float drawY = (y > 0) ? y : 50;

            try (PDPageContentStream cs = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                cs.drawImage(pdImage, drawX, drawY, drawW, drawH);
            }

            document.save(outputPath.toFile());
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "sign-pdf");
        } catch (Exception e) {
            log.error("Failed to sign PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to place signature onto PDF.", "sign-pdf");
        }
    }
}
