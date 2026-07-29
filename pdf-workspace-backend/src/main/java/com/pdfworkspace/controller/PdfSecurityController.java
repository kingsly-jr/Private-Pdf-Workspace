package com.pdfworkspace.controller;

import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.service.FeatureFlagService;
import com.pdfworkspace.service.PdfSecurityService;
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
public class PdfSecurityController {

    private final FeatureFlagService featureFlagService;
    private final TempStorageService tempStorageService;
    private final ToolRunHistoryService historyService;
    private final PdfSecurityService securityService;

    @PostMapping("/protect")
    public ResponseEntity<Resource> protectPdf(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "userPassword", required = false) String userPassword,
            @RequestParam(value = "ownerPassword", required = false) String ownerPassword,
            @RequestParam(value = "allowPrinting", defaultValue = "true") boolean allowPrinting,
            @RequestParam(value = "allowCopying", defaultValue = "true") boolean allowCopying) {
        String toolKey = "protect";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);
        if (userPassword == null || userPassword.isBlank()) {
            throw new PdfWorkspaceException("INVALID_INPUT", "User password is required to protect PDF.", toolKey);
        }

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("protected_document.pdf");

            securityService.protectPdf(savedFile, userPassword, ownerPassword, allowPrinting, allowCopying, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"protected_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file != null ? file.getSize() : 0, 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to protect PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/unlock")
    public ResponseEntity<Resource> unlockPdf(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "password", required = false) String password) {
        String toolKey = "unlock";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);
        if (password == null || password.isBlank()) {
            throw new PdfWorkspaceException("INVALID_INPUT", "Password is required to unlock PDF.", toolKey);
        }

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("unlocked_document.pdf");

            securityService.unlockPdf(savedFile, password, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"unlocked_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file != null ? file.getSize() : 0, 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to unlock PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/redact")
    public ResponseEntity<Resource> redactPdf(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "keyword", required = false) String keyword) {
        String toolKey = "redact";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("redacted_document.pdf");

            securityService.redactPdf(savedFile, keyword, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"redacted_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to redact PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/repair")
    public ResponseEntity<Resource> repairPdf(@RequestParam("file") MultipartFile file) {
        String toolKey = "repair";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("repaired_document.pdf");

            securityService.repairPdf(savedFile, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"repaired_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to repair PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/compare")
    public ResponseEntity<Resource> comparePdf(
            @RequestParam("file1") MultipartFile file1,
            @RequestParam("file2") MultipartFile file2) {
        String toolKey = "compare";
        featureFlagService.validateToolEnabled(toolKey);
        if (file1 == null || file1.isEmpty() || file2 == null || file2.isEmpty()) {
            throw new PdfWorkspaceException("INVALID_FILE", "Both PDF files are required for comparison.", toolKey);
        }

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path saved1 = tempStorageService.saveFile(file1, workingDir);
            Path saved2 = tempStorageService.saveFile(file2, workingDir);
            Path outputPath = workingDir.resolve("comparison_report.pdf");

            securityService.comparePdfs(saved1, saved2, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 2, file1.getSize() + file2.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"comparison_report.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 2, 0, 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to compare PDFs.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/ocr")
    public ResponseEntity<Resource> ocrPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "language", defaultValue = "eng") String language) {
        String toolKey = "ocr";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("searchable_ocr.pdf");

            securityService.ocrPdf(savedFile, language, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"searchable_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to perform OCR on PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/metadata-editor")
    public ResponseEntity<Resource> updateMetadata(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "author", required = false) String author,
            @RequestParam(value = "subject", required = false) String subject,
            @RequestParam(value = "keywords", required = false) String keywords,
            @RequestParam(value = "creator", required = false) String creator) {
        String toolKey = "metadata-editor";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("updated_metadata.pdf");

            securityService.updateMetadata(savedFile, title, author, subject, keywords, creator, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"updated_metadata.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to update PDF metadata.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    private void validateFile(MultipartFile file, String toolKey) {
        if (file == null || file.isEmpty()) {
            throw new PdfWorkspaceException("INVALID_FILE", "Please select a valid PDF file.", toolKey);
        }
    }
}
