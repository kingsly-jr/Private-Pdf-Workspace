package com.pdfworkspace.controller;

import com.pdfworkspace.dto.intelligence.AiSummaryResponseDto;
import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.service.FeatureFlagService;
import com.pdfworkspace.service.PdfIntelligenceService;
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
public class PdfIntelligenceController {

    private final FeatureFlagService featureFlagService;
    private final TempStorageService tempStorageService;
    private final ToolRunHistoryService historyService;
    private final PdfIntelligenceService intelligenceService;

    @PostMapping("/ai-summary")
    public ResponseEntity<AiSummaryResponseDto> aiSummary(@RequestParam("file") MultipartFile file) {
        String toolKey = "ai-summary";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);

            AiSummaryResponseDto summaryDto = intelligenceService.aiSummarize(savedFile, file.getOriginalFilename());

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), summaryDto.getRawMarkdown().length(), duration, null);

            return ResponseEntity.ok(summaryDto);

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to generate AI summary.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/translate")
    public ResponseEntity<Resource> translatePdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "targetLang", defaultValue = "en") String targetLang) {
        String toolKey = "translate";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("translated_document.pdf");

            intelligenceService.translatePdf(savedFile, targetLang, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"translated_" + targetLang + ".pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to translate PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/create-form")
    public ResponseEntity<Resource> createPdfForm(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "fieldsJson", required = false) String fieldsJson) {
        String toolKey = "pdf-forms";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("fillable_form.pdf");

            intelligenceService.createPdfForm(savedFile, null, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"fillable_form.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to create PDF form.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    private void validateFile(MultipartFile file, String toolKey) {
        if (file == null || file.isEmpty()) {
            throw new PdfWorkspaceException("INVALID_FILE", "Please upload a valid input file.", toolKey);
        }
    }
}
