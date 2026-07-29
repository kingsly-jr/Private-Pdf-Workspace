package com.pdfworkspace.controller;

import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.service.FeatureFlagService;
import com.pdfworkspace.service.PdfConversionService;
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

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
public class PdfConversionController {

    private final FeatureFlagService featureFlagService;
    private final TempStorageService tempStorageService;
    private final ToolRunHistoryService historyService;
    private final PdfConversionService conversionService;

    @PostMapping("/pdf-to-word")
    public ResponseEntity<Resource> pdfToWord(@RequestParam("file") MultipartFile file) {
        String toolKey = "pdf-to-word";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("converted_document.docx");

            conversionService.pdfToWord(savedFile, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"document.docx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to Word.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/word-to-pdf")
    public ResponseEntity<Resource> wordToPdf(@RequestParam("file") MultipartFile file) {
        String toolKey = "word-to-pdf";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("converted_document.pdf");

            conversionService.wordToPdf(savedFile, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert Word to PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/pdf-to-excel")
    public ResponseEntity<Resource> pdfToExcel(@RequestParam("file") MultipartFile file) {
        String toolKey = "pdf-to-excel";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("converted_spreadsheet.xlsx");

            conversionService.pdfToExcel(savedFile, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"spreadsheet.xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to Excel.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/excel-to-pdf")
    public ResponseEntity<Resource> excelToPdf(@RequestParam("file") MultipartFile file) {
        String toolKey = "excel-to-pdf";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("converted_excel.pdf");

            conversionService.excelToPdf(savedFile, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"spreadsheet.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert Excel to PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/pdf-to-powerpoint")
    public ResponseEntity<Resource> pdfToPowerPoint(@RequestParam("file") MultipartFile file) {
        String toolKey = "pdf-to-powerpoint";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("presentation.pptx");

            conversionService.pdfToPowerPoint(savedFile, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"presentation.pptx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation"))
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to PowerPoint.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/powerpoint-to-pdf")
    public ResponseEntity<Resource> powerPointToPdf(@RequestParam("file") MultipartFile file) {
        String toolKey = "powerpoint-to-pdf";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("presentation.pdf");

            conversionService.powerPointToPdf(savedFile, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"presentation.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PowerPoint to PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/pdf-to-jpg")
    public ResponseEntity<Resource> pdfToJpg(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "dpi", defaultValue = "200") int dpi) {
        String toolKey = "pdf-to-jpg";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);

            Path resultFile = conversionService.pdfToJpg(savedFile, dpi, workingDir);
            byte[] resultBytes = Files.readAllBytes(resultFile);

            boolean isZip = resultFile.getFileName().toString().endsWith(".zip");
            MediaType mediaType = isZip ? MediaType.parseMediaType("application/zip") : MediaType.IMAGE_JPEG;
            String filename = isZip ? "pdf_images.zip" : "page_1.jpg";

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(mediaType)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to JPG.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/jpg-to-pdf")
    public ResponseEntity<Resource> jpgToPdf(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "pageSize", defaultValue = "A4") String pageSize,
            @RequestParam(value = "orientation", defaultValue = "portrait") String orientation,
            @RequestParam(value = "margin", defaultValue = "0") float margin) {
        String toolKey = "jpg-to-pdf";
        featureFlagService.validateToolEnabled(toolKey);
        if (files == null || files.isEmpty()) {
            throw new PdfWorkspaceException("INVALID_FILE", "Please select at least one image file.", toolKey);
        }

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            List<Path> savedImages = new ArrayList<>();
            long totalInputSize = 0;

            for (MultipartFile file : files) {
                totalInputSize += file.getSize();
                savedImages.add(tempStorageService.saveFile(file, workingDir));
            }

            Path outputPath = workingDir.resolve("images_combined.pdf");
            conversionService.jpgToPdf(savedImages, pageSize, orientation, margin, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", files.size(), totalInputSize, resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"images_combined.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", files.size(), 0, 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert images to PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/extract-text")
    public ResponseEntity<Resource> extractText(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "format", defaultValue = "txt") String format) {
        String toolKey = "extract-text";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);

            Path resultFile = conversionService.extractText(savedFile, format, workingDir);
            byte[] resultBytes = Files.readAllBytes(resultFile);

            boolean isDocx = "docx".equalsIgnoreCase(format);
            MediaType mediaType = isDocx ? MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document") : MediaType.TEXT_PLAIN;
            String filename = isDocx ? "extracted_text.docx" : "extracted_text.txt";

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(mediaType)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to extract text.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/pdf-to-markdown")
    public ResponseEntity<Resource> pdfToMarkdown(@RequestParam("file") MultipartFile file) {
        String toolKey = "pdf-to-markdown";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("document.md");

            conversionService.pdfToMarkdown(savedFile, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"document.md\"")
                    .contentType(MediaType.parseMediaType("text/markdown"))
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to Markdown.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/scan-to-pdf")
    public ResponseEntity<Resource> scanToPdf(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "pageSize", defaultValue = "A4") String pageSize,
            @RequestParam(value = "orientation", defaultValue = "portrait") String orientation,
            @RequestParam(value = "margin", defaultValue = "0") float margin) {
        String toolKey = "scan-to-pdf";
        featureFlagService.validateToolEnabled(toolKey);

        if (files == null || files.isEmpty()) {
            throw new PdfWorkspaceException("INVALID_FILE", "Please capture at least one image page to scan.", toolKey);
        }

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            List<Path> savedImages = new ArrayList<>();
            long totalInputSize = 0;

            for (MultipartFile file : files) {
                totalInputSize += file.getSize();
                savedImages.add(tempStorageService.saveFile(file, workingDir));
            }

            Path outputPath = workingDir.resolve("scanned_document.pdf");
            conversionService.jpgToPdf(savedImages, pageSize, orientation, margin, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", files.size(), totalInputSize, resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"scanned_document.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", files.size(), 0, 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert scanned pages to PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/html-to-pdf")
    public ResponseEntity<Resource> htmlToPdf(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "url", required = false) String url) {
        String toolKey = "html-to-pdf";
        featureFlagService.validateToolEnabled(toolKey);

        if ((file == null || file.isEmpty()) && (url == null || url.trim().isEmpty())) {
            throw new PdfWorkspaceException("INVALID_INPUT", "Please upload an HTML file or specify a website URL.", toolKey);
        }

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            String htmlContent = url;

            if (file != null && !file.isEmpty()) {
                Path savedFile = tempStorageService.saveFile(file, workingDir);
                htmlContent = Files.readString(savedFile, StandardCharsets.UTF_8);
            }

            Path outputPath = workingDir.resolve("converted_html.pdf");
            conversionService.htmlToPdf(htmlContent, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            long inputSize = file != null ? file.getSize() : (url != null ? url.length() : 0);
            historyService.recordRun(toolKey, "SUCCESS", 1, inputSize, resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"converted_html.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            long inputSize = file != null ? file.getSize() : 0;
            historyService.recordRun(toolKey, "FAILED", 1, inputSize, 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert HTML to PDF.", toolKey);
        } finally {
            if (workingDir != null) tempStorageService.purgeDirectory(workingDir);
        }
    }

    @PostMapping("/pdf-to-pdfa")
    public ResponseEntity<Resource> pdfToPdfA(@RequestParam("file") MultipartFile file) {
        String toolKey = "pdf-to-pdfa";
        featureFlagService.validateToolEnabled(toolKey);
        validateFile(file, toolKey);

        long startTime = System.currentTimeMillis();
        Path workingDir = null;
        try {
            workingDir = tempStorageService.createWorkingDir();
            Path savedFile = tempStorageService.saveFile(file, workingDir);
            Path outputPath = workingDir.resolve("archival_pdfa.pdf");

            conversionService.pdfToPdfA(savedFile, outputPath);
            byte[] resultBytes = Files.readAllBytes(outputPath);

            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "SUCCESS", 1, file.getSize(), resultBytes.length, duration, null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"archival_pdfa.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(resultBytes.length)
                    .body(new ByteArrayResource(resultBytes));

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            historyService.recordRun(toolKey, "FAILED", 1, file.getSize(), 0, duration, "PROCESSING_FAILED");
            if (e instanceof PdfWorkspaceException pwe) throw pwe;
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to PDF/A.", toolKey);
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
