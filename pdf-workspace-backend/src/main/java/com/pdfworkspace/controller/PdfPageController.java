package com.pdfworkspace.controller;

import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.service.FeatureFlagService;
import com.pdfworkspace.service.PdfPageService;
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
import java.util.ArrayList;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
public class PdfPageController {

    private final FeatureFlagService featureFlagService;
    private final TempStorageService tempStorageService;
    private final ToolRunHistoryService historyService;
    private final PdfPageService pdfPageService;

    @PostMapping("/merge")
    public ResponseEntity<Resource> mergePdf(@RequestParam("files") List<MultipartFile> files) {
        String toolKey = "merge";
        featureFlagService.validateToolEnabled(toolKey);
        if (files == null || files.size() < 2) {
            throw new PdfWorkspaceException("INVALID_FILE", "At least two PDF files are required for merging.", toolKey);
        }

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            List<Path> savedPaths = new ArrayList<>();
            long totalInputSize = 0;

            for (MultipartFile file : files) {
                totalInputSize += file.getSize();
                savedPaths.add(tempStorageService.saveFile(file, workingDir));
            }

            Path outputPath = workingDir.resolve("merged_document.pdf");
            pdfPageService.mergePdfFiles(savedPaths, outputPath);

            byte[] resultBytes = Files.readAllBytes(outputPath);
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", files.size(), totalInputSize, resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"merged_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", files.size(), 0, 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to merge PDF files.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/split")
    public ResponseEntity<Resource> splitPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "splitMode", defaultValue = "all") String splitMode,
            @RequestParam(value = "ranges", required = false) String ranges,
            @RequestParam(value = "interval", required = false) Integer interval) {
        String toolKey = "split";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);

            Path zipOutput = pdfPageService.splitPdf(savedFile, splitMode, ranges, interval, workingDir);
            byte[] resultBytes = Files.readAllBytes(zipOutput);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"split_documents.zip\"")
                    .contentType(MediaType.parseMediaType("application/zip"))
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to split PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/rotate")
    public ResponseEntity<Resource> rotatePdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "angle", defaultValue = "90") int angle,
            @RequestParam(value = "pages", required = false) String pages) {
        String toolKey = "rotate";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("rotated_document.pdf");

            pdfPageService.rotatePdf(savedFile, angle, pages, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"rotated_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to rotate PDF pages.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/delete-pages")
    public ResponseEntity<Resource> deletePages(
            @RequestParam("file") MultipartFile file,
            @RequestParam("pages") String pages) {
        String toolKey = "delete-pages";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("deleted_pages_document.pdf");

            pdfPageService.deletePages(savedFile, pages, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"modified_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to delete PDF pages.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/crop")
    public ResponseEntity<Resource> cropPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "top", defaultValue = "0") float top,
            @RequestParam(value = "bottom", defaultValue = "0") float bottom,
            @RequestParam(value = "left", defaultValue = "0") float left,
            @RequestParam(value = "right", defaultValue = "0") float right) {
        String toolKey = "crop";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("cropped_document.pdf");

            pdfPageService.cropPdf(savedFile, top, bottom, left, right, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"cropped_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to crop PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/resize")
    public ResponseEntity<Resource> resizePdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "pageSize", defaultValue = "A4") String pageSize,
            @RequestParam(value = "orientation", defaultValue = "portrait") String orientation,
            @RequestParam(value = "margin", defaultValue = "0") float margin) {
        String toolKey = "resize";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("resized_document.pdf");

            pdfPageService.resizePdf(savedFile, pageSize, orientation, margin, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"resized_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to resize PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/extract-images")
    public ResponseEntity<Resource> extractImages(@RequestParam("file") MultipartFile file) {
        String toolKey = "extract-images";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);

            Path zipOutput = pdfPageService.extractImages(savedFile, workingDir);
            byte[] resultBytes = Files.readAllBytes(zipOutput);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"extracted_images.zip\"")
                    .contentType(MediaType.parseMediaType("application/zip"))
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to extract images.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    private void validateFile(MultipartFile file, String toolKey) {
        if (file == null || file.isEmpty()) {
            throw new PdfWorkspaceException("INVALID_FILE", "Please select a valid PDF document.", toolKey);
        }
    }
}
