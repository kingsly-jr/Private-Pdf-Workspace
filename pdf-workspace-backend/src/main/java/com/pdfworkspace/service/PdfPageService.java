package com.pdfworkspace.service;

import com.pdfworkspace.exception.PdfWorkspaceException;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
public class PdfPageService {

    /**
     * Merge multiple PDF files into one output PDF.
     */
    public void mergePdfFiles(List<Path> inputPdfPaths, Path outputPath) {
        PDFMergerUtility merger = new PDFMergerUtility();
        merger.setDestinationFileName(outputPath.toAbsolutePath().toString());

        try {
            for (Path path : inputPdfPaths) {
                // Pre-verify each document is unencrypted
                try (PDDocument doc = Loader.loadPDF(path.toFile())) {
                    merger.addSource(path.toFile());
                } catch (InvalidPasswordException e) {
                    throw new PdfWorkspaceException("PASSWORD_PROTECTED", "One of the files is password-protected.", "merge");
                }
            }
            merger.mergeDocuments(null);
        } catch (PdfWorkspaceException pwe) {
            throw pwe;
        } catch (Exception e) {
            log.error("Failed to merge PDF files", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to merge PDF documents.", "merge");
        }
    }

    /**
     * Split a PDF by mode: 'all' (all pages to ZIP), 'range' (specific ranges), or 'interval'.
     */
    public Path splitPdf(Path inputPdfPath, String mode, String rangesStr, Integer interval, Path outputWorkingDir) {
        try (PDDocument document = Loader.loadPDF(inputPdfPath.toFile())) {
            int totalPages = document.getNumberOfPages();
            Path zipOutput = outputWorkingDir.resolve("split_documents.zip");

            try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipOutput.toFile()))) {

                if ("all".equalsIgnoreCase(mode)) {
                    for (int i = 0; i < totalPages; i++) {
                        try (PDDocument singlePageDoc = new PDDocument()) {
                            singlePageDoc.addPage(document.getPage(i));
                            ByteArrayOutputStream baos = new ByteArrayOutputStream();
                            singlePageDoc.save(baos);
                            writeZipEntry(zos, "page_" + (i + 1) + ".pdf", baos.toByteArray());
                        }
                    }
                } else if ("interval".equalsIgnoreCase(mode) && interval != null && interval > 0) {
                    int part = 1;
                    for (int i = 0; i < totalPages; i += interval) {
                        int end = Math.min(i + interval, totalPages);
                        try (PDDocument chunkDoc = new PDDocument()) {
                            for (int j = i; j < end; j++) {
                                chunkDoc.addPage(document.getPage(j));
                            }
                            ByteArrayOutputStream baos = new ByteArrayOutputStream();
                            chunkDoc.save(baos);
                            writeZipEntry(zos, "part_" + part + "_pages_" + (i + 1) + "-" + end + ".pdf", baos.toByteArray());
                            part++;
                        }
                    }
                } else { // 'range' mode or default custom pages
                    Set<Integer> pageNumbers = parsePageRanges(rangesStr, totalPages);
                    try (PDDocument extractedDoc = new PDDocument()) {
                        for (int pageNum : pageNumbers) {
                            extractedDoc.addPage(document.getPage(pageNum - 1));
                        }
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        extractedDoc.save(baos);
                        writeZipEntry(zos, "extracted_pages.pdf", baos.toByteArray());
                    }
                }
            }

            return zipOutput;
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "split");
        } catch (PdfWorkspaceException pwe) {
            throw pwe;
        } catch (Exception e) {
            log.error("Failed to split PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to split PDF document.", "split");
        }
    }

    /**
     * Rotate pages by angle (90, 180, 270). Optional target pages string (e.g., "1,3-5").
     */
    public void rotatePdf(Path inputPdfPath, int angle, String targetPagesStr, Path outputPath) {
        try (PDDocument document = Loader.loadPDF(inputPdfPath.toFile())) {
            int totalPages = document.getNumberOfPages();
            Set<Integer> targetPages = (targetPagesStr != null && !targetPagesStr.isBlank())
                    ? parsePageRanges(targetPagesStr, totalPages)
                    : null;

            for (int i = 0; i < totalPages; i++) {
                int pageNum = i + 1;
                if (targetPages == null || targetPages.contains(pageNum)) {
                    PDPage page = document.getPage(i);
                    int currentRotation = page.getRotation();
                    page.setRotation((currentRotation + angle) % 360);
                }
            }
            document.save(outputPath.toFile());
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "rotate");
        } catch (Exception e) {
            log.error("Failed to rotate PDF pages", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to rotate PDF pages.", "rotate");
        }
    }

    /**
     * Delete specified page numbers from PDF.
     */
    public void deletePages(Path inputPdfPath, String deletePagesStr, Path outputPath) {
        try (PDDocument document = Loader.loadPDF(inputPdfPath.toFile())) {
            int totalPages = document.getNumberOfPages();
            Set<Integer> pagesToDelete = parsePageRanges(deletePagesStr, totalPages);

            if (pagesToDelete.size() >= totalPages) {
                throw new PdfWorkspaceException("INVALID_INPUT", "Cannot delete all pages from document.", "delete-pages");
            }

            try (PDDocument newDoc = new PDDocument()) {
                for (int i = 0; i < totalPages; i++) {
                    int pageNum = i + 1;
                    if (!pagesToDelete.contains(pageNum)) {
                        newDoc.addPage(document.getPage(i));
                    }
                }
                newDoc.save(outputPath.toFile());
            }
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "delete-pages");
        } catch (PdfWorkspaceException pwe) {
            throw pwe;
        } catch (Exception e) {
            log.error("Failed to delete pages from PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to delete PDF pages.", "delete-pages");
        }
    }

    /**
     * Organize pages: reorder page sequence, apply individual rotations, insert blank pages.
     */
    public void organizePdf(Path inputPdfPath, List<Integer> pageOrder, Map<Integer, Integer> rotations, List<Integer> insertBlankAt, Path outputPath) {
        try (PDDocument originalDoc = Loader.loadPDF(inputPdfPath.toFile())) {
            int totalPages = originalDoc.getNumberOfPages();

            try (PDDocument newDoc = new PDDocument()) {
                List<Integer> order = (pageOrder != null && !pageOrder.isEmpty()) ? pageOrder : getDefaultPageOrder(totalPages);
                Set<Integer> blankPositions = (insertBlankAt != null) ? new HashSet<>(insertBlankAt) : Collections.emptySet();

                for (int i = 0; i < order.size(); i++) {
                    int origPageNum = order.get(i);
                    if (origPageNum >= 1 && origPageNum <= totalPages) {
                        PDPage page = originalDoc.getPage(origPageNum - 1);
                        if (rotations != null && rotations.containsKey(origPageNum)) {
                            int addRot = rotations.get(origPageNum);
                            page.setRotation((page.getRotation() + addRot) % 360);
                        }
                        newDoc.addPage(page);
                    }

                    if (blankPositions.contains(i + 1)) {
                        newDoc.addPage(new PDPage(PDRectangle.A4));
                    }
                }
                newDoc.save(outputPath.toFile());
            }
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "organize");
        } catch (Exception e) {
            log.error("Failed to organize PDF pages", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to organize PDF pages.", "organize");
        }
    }

    /**
     * Crop PDF pages by margins in points (top, bottom, left, right).
     */
    public void cropPdf(Path inputPdfPath, float top, float bottom, float left, float right, Path outputPath) {
        try (PDDocument document = Loader.loadPDF(inputPdfPath.toFile())) {
            for (PDPage page : document.getPages()) {
                PDRectangle mediaBox = page.getMediaBox();
                float newX = mediaBox.getLowerLeftX() + left;
                float newY = mediaBox.getLowerLeftY() + bottom;
                float newWidth = mediaBox.getWidth() - left - right;
                float newHeight = mediaBox.getHeight() - top - bottom;

                if (newWidth > 10 && newHeight > 10) {
                    page.setCropBox(new PDRectangle(newX, newY, newWidth, newHeight));
                }
            }
            document.save(outputPath.toFile());
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "crop");
        } catch (Exception e) {
            log.error("Failed to crop PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to crop PDF.", "crop");
        }
    }

    /**
     * Resize PDF pages to standard paper size (A4, Letter, Legal, A3) with orientation.
     */
    public void resizePdf(Path inputPdfPath, String pageSizeStr, String orientation, float margin, Path outputPath) {
        try (PDDocument document = Loader.loadPDF(inputPdfPath.toFile())) {
            PDRectangle targetBox = parsePaperSize(pageSizeStr);
            boolean isLandscape = "landscape".equalsIgnoreCase(orientation);

            if (isLandscape && targetBox.getWidth() < targetBox.getHeight()) {
                targetBox = new PDRectangle(targetBox.getHeight(), targetBox.getWidth());
            }

            for (PDPage page : document.getPages()) {
                page.setMediaBox(targetBox);
                page.setCropBox(targetBox);
            }
            document.save(outputPath.toFile());
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "resize");
        } catch (Exception e) {
            log.error("Failed to resize PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to resize PDF.", "resize");
        }
    }

    /**
     * Extract all embedded images from a PDF document into a ZIP file.
     */
    public Path extractImages(Path inputPdfPath, Path outputWorkingDir) {
        try (PDDocument document = Loader.loadPDF(inputPdfPath.toFile())) {
            Path zipOutput = outputWorkingDir.resolve("extracted_images.zip");
            int imageCounter = 1;

            try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipOutput.toFile()))) {
                int pageNum = 1;
                for (PDPage page : document.getPages()) {
                    PDResources resources = page.getResources();
                    if (resources != null) {
                        for (COSName name : resources.getXObjectNames()) {
                            PDXObject xobject = resources.getXObject(name);
                            if (xobject instanceof PDImageXObject image) {
                                BufferedImage bImage = image.getImage();
                                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                ImageIO.write(bImage, "png", baos);

                                String entryName = "image_page" + pageNum + "_" + imageCounter + ".png";
                                writeZipEntry(zos, entryName, baos.toByteArray());
                                imageCounter++;
                            }
                        }
                    }
                    pageNum++;
                }
            }

            if (imageCounter == 1) {
                throw new PdfWorkspaceException("PROCESSING_FAILED", "No embedded images found in this PDF document.", "extract-images");
            }

            return zipOutput;
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "extract-images");
        } catch (PdfWorkspaceException pwe) {
            throw pwe;
        } catch (Exception e) {
            log.error("Failed to extract images from PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to extract images from PDF.", "extract-images");
        }
    }

    /**
     * Helper to parse comma/dash page range strings like "1-3, 5, 7-9".
     */
    public Set<Integer> parsePageRanges(String rangesStr, int totalPages) {
        Set<Integer> pageNumbers = new TreeSet<>();
        if (rangesStr == null || rangesStr.isBlank()) {
            for (int i = 1; i <= totalPages; i++) pageNumbers.add(i);
            return pageNumbers;
        }

        String[] parts = rangesStr.split(",");
        for (String part : parts) {
            part = part.trim();
            if (part.contains("-")) {
                String[] bounds = part.split("-");
                if (bounds.length == 2) {
                    try {
                        int start = Math.max(1, Integer.parseInt(bounds[0].trim()));
                        int end = Math.min(totalPages, Integer.parseInt(bounds[1].trim()));
                        for (int i = start; i <= end; i++) {
                            pageNumbers.add(i);
                        }
                    } catch (NumberFormatException ignored) {}
                }
            } else {
                try {
                    int p = Integer.parseInt(part);
                    if (p >= 1 && p <= totalPages) {
                        pageNumbers.add(p);
                    }
                } catch (NumberFormatException ignored) {}
            }
        }
        return pageNumbers;
    }

    private PDRectangle parsePaperSize(String pageSizeStr) {
        if ("LETTER".equalsIgnoreCase(pageSizeStr)) return PDRectangle.LETTER;
        if ("LEGAL".equalsIgnoreCase(pageSizeStr)) return PDRectangle.LEGAL;
        if ("A3".equalsIgnoreCase(pageSizeStr)) return PDRectangle.A3;
        return PDRectangle.A4; // default A4
    }

    private List<Integer> getDefaultPageOrder(int totalPages) {
        List<Integer> list = new ArrayList<>();
        for (int i = 1; i <= totalPages; i++) list.add(i);
        return list;
    }

    private void writeZipEntry(ZipOutputStream zos, String filename, byte[] bytes) throws IOException {
        ZipEntry entry = new ZipEntry(filename);
        zos.putNextEntry(entry);
        zos.write(bytes);
        zos.closeEntry();
    }
}
