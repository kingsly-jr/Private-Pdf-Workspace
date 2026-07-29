package com.pdfworkspace.controller;

import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.service.FeatureFlagService;
import com.pdfworkspace.service.PdfAnnotationService;
import com.pdfworkspace.service.TempStorageService;
import com.pdfworkspace.service.ToolRunHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
public class PdfAnnotationController {

    private final FeatureFlagService featureFlagService;
    private final TempStorageService tempStorageService;
    private final ToolRunHistoryService historyService;
    private final PdfAnnotationService annotationService;

    @PostMapping("/watermark")
    public ResponseEntity<Resource> watermark(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "text", defaultValue = "CONFIDENTIAL") String text,
            @RequestParam(value = "watermarkImage", required = false) MultipartFile watermarkImage,
            @RequestParam(value = "opacity", defaultValue = "0.3") float opacity,
            @RequestParam(value = "rotation", defaultValue = "45") int rotation,
            @RequestParam(value = "fontSize", defaultValue = "48") float fontSize,
            @RequestParam(value = "position", defaultValue = "center") String position) {
        String toolKey = "watermark";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("watermarked_document.pdf");

            if (watermarkImage != null && !watermarkImage.isEmpty()) {
                Path savedImg = tempStorageService.saveFile(watermarkImage, workingDir);
                annotationService.applyImageWatermark(savedFile, savedImg, opacity, rotation, position, outputPath);
            } else {
                annotationService.applyTextWatermark(savedFile, text, opacity, rotation, fontSize, position, outputPath);
            }

            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"watermarked_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to apply watermark.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/page-numbers")
    public ResponseEntity<Resource> pageNumbers(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "position", defaultValue = "footer") String position,
            @RequestParam(value = "alignment", defaultValue = "center") String alignment,
            @RequestParam(value = "format", defaultValue = "Page {n} of {total}") String format,
            @RequestParam(value = "fontSize", defaultValue = "10") float fontSize) {
        String toolKey = "page-numbers";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("numbered_document.pdf");

            annotationService.addPageNumbers(savedFile, position, alignment, format, fontSize, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"numbered_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to add page numbers.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/sign-pdf")
    public ResponseEntity<Resource> signPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "signatureFile", required = false) MultipartFile signatureFile,
            @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
            @RequestParam(value = "posX", defaultValue = "50") float posX,
            @RequestParam(value = "posY", defaultValue = "50") float posY,
            @RequestParam(value = "width", defaultValue = "150") float width,
            @RequestParam(value = "height", defaultValue = "60") float height) {
        String toolKey = "sign-pdf";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);
        if (signatureFile == null || signatureFile.isEmpty()) {
            throw new PdfWorkspaceException("INVALID_FILE", "Signature image file is required.", toolKey);
        }

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedDoc = tempStorageService.saveFile(file, workingDir);
            Path savedSig = tempStorageService.saveFile(signatureFile, workingDir);
            Path outputPath = workingDir.resolve("signed_document.pdf");

            annotationService.signPdf(savedDoc, savedSig, pageNum, posX, posY, width, height, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"signed_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to sign PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    private void validateFile(MultipartFile file, String toolKey) {
        if (file == null || file.isEmpty()) {
            throw new PdfWorkspaceException("INVALID_FILE", "Please upload a valid PDF document.", toolKey);
        }
    }
}
