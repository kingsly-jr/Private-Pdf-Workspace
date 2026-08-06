package com.pdfworkspace.controller;

import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.service.FeatureFlagService;
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
public class PublicPdfTestController {

    private final FeatureFlagService featureFlagService;
    private final TempStorageService tempStorageService;
    private final ToolRunHistoryService historyService;

    @PostMapping("/echo")
    public ResponseEntity<Resource> echoTestPdf(@RequestParam("file") MultipartFile file) {
        long startTime = System.currentTimeMillis();
        String toolKey = "echo";

        if (file.isEmpty()) {
            throw new PdfWorkspaceException("INVALID_FILE", "Uploaded file is empty.");
        }

        // 1. Feature Flag Check
        featureFlagService.validateToolEnabled(toolKey);

        Path workingDir = null;
        try {
            // 2. Temp Storage Allocation
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);

            byte[] fileBytes = Files.readAllBytes(savedFile);
            long duration = System.currentTimeMillis() - startTime;

            // 3. Anonymous History Telemetry
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), fileBytes.length, duration, null);

            String filename = "processed_" + (file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf");
            ByteArrayResource resource = new ByteArrayResource(fileBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(fileBytes.length)
                    .body(resource);

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) {
                throw pwe;
            }
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to process PDF echo test stream");
        } finally {
            // 4. Guaranteed Temp Directory Purge
            if (workingDir != null) {
                tempStorageService.purgeDirectory(workingDir);
            }
        }
    }
}
