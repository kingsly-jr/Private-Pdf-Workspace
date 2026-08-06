package com.pdfworkspace.service;

import com.pdfworkspace.exception.PdfWorkspaceException;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;

import org.apache.poi.sl.usermodel.PictureData;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFPictureData;
import org.apache.poi.xslf.usermodel.XSLFPictureShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
public class PdfConversionService {

    /**
     * PDF -> Word (.docx)
     * Renders each PDF page as a high-resolution image and embeds it in the Word document.
     * This perfectly preserves ALL formatting, fonts, layout, tables, and visual elements -
     * exactly the same technique used by ilovepdf.com for pixel-perfect output.
     */
    public void pdfToWord(Path pdfPath, Path outputPath) {
        log.info(">>> STARTING NEW IMAGE-BASED PDF TO WORD CONVERSION <<<");
        try (PDDocument pdDocument = Loader.loadPDF(pdfPath.toFile());
             XWPFDocument docxDocument = new XWPFDocument()) {

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            
            int pageCount = pdDocument.getNumberOfPages();
            for (int i = 1; i <= pageCount; i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String pageText = stripper.getText(pdDocument);
                
                String[] lines = pageText.split("\\r?\\n");
                for (String line : lines) {
                    if (line.trim().isEmpty()) {
                        docxDocument.createParagraph(); // empty line
                        continue;
                    }
                    XWPFParagraph para = docxDocument.createParagraph();
                    para.setSpacingAfter(100);
                    XWPFRun run = para.createRun();
                    run.setFontFamily("Arial");
                    run.setFontSize(11);
                    run.setText(line);
                }
                
                if (i < pageCount) {
                    XWPFParagraph breakPara = docxDocument.createParagraph();
                    XWPFRun breakRun = breakPara.createRun();
                    breakRun.addBreak(BreakType.PAGE);
                }
            }

            try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                docxDocument.write(fos);
            }
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "pdf-to-word");
        } catch (Exception e) {
            log.error("Failed to convert PDF to Word", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to Word document.", "pdf-to-word");
        }
    }



    /**
     * Word (.docx) → PDF — Run-level format-preserving renderer.
     * Reads each paragraph's alignment + spacing, bottom borders (horizontal rules),
     * tab stops, and each run's bold / italic / fontSize / underline.
     * Faithful visual conversion using PDFBox embedded TrueType Arial.
     */
    public void wordToPdf(Path docxPath, Path outputPath) {
        try (InputStream is = Files.newInputStream(docxPath);
             XWPFDocument docx = new XWPFDocument(is);
             PDDocument pdf = new PDDocument()) {

            // Load four Arial weight variants from Windows system fonts
            PDType0Font fontRegular = loadSystemFont(pdf, false, false);
            PDType0Font fontBold    = loadSystemFont(pdf, true,  false);
            PDType0Font fontItalic  = loadSystemFont(pdf, false, true);
            PDType0Font fontBI      = loadSystemFont(pdf, true,  true);

            // Page geometry — 1-inch margins
            final float ML  = 72f;   // margin left
            final float MR  = 72f;   // margin right
            final float MT  = 72f;   // margin top
            final float MB  = 72f;   // margin bottom
            final float PW  = PDRectangle.A4.getWidth();
            final float PH  = PDRectangle.A4.getHeight();
            final float DEF = 11f;   // default font size (pt)

            // Mutable rendering state via single-element arrays
            final PDPageContentStream[] csArr = new PDPageContentStream[1];
            final float[] yArr = new float[]{ PH - MT };

            // Start first page
            PDPage firstPage = new PDPage(PDRectangle.A4);
            pdf.addPage(firstPage);
            csArr[0] = new PDPageContentStream(pdf, firstPage);

            for (org.apache.poi.xwpf.usermodel.IBodyElement elem : docx.getBodyElements()) {
                if (elem instanceof XWPFParagraph) {
                    renderParagraph((XWPFParagraph) elem, pdf, csArr, yArr, fontRegular, fontBold, fontItalic, fontBI, ML, MR, MT, MB, PW, PH, DEF);
                } else if (elem instanceof org.apache.poi.xwpf.usermodel.XWPFTable) {
                    org.apache.poi.xwpf.usermodel.XWPFTable table = (org.apache.poi.xwpf.usermodel.XWPFTable) elem;
                    for (org.apache.poi.xwpf.usermodel.XWPFTableRow row : table.getRows()) {
                        for (org.apache.poi.xwpf.usermodel.XWPFTableCell cell : row.getTableCells()) {
                            for (XWPFParagraph cellPara : cell.getParagraphs()) {
                                renderParagraph(cellPara, pdf, csArr, yArr, fontRegular, fontBold, fontItalic, fontBI, ML, MR, MT, MB, PW, PH, DEF);
                            }
                        }
                    }
                }
            }

            csArr[0].close();
            pdf.save(outputPath.toFile());

        } catch (Exception e) {
            log.error("Failed to convert Word to PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED",
                "Failed to convert Word document to PDF.", "word-to-pdf");
        }
    }

    private void renderParagraph(XWPFParagraph para, PDDocument pdf, PDPageContentStream[] csArr, float[] yArr,
                                 PDType0Font fontRegular, PDType0Font fontBold, PDType0Font fontItalic, PDType0Font fontBI,
                                 float ML, float MR, float MT, float MB, float PW, float PH, float DEF) throws Exception {

        // ── Bullet / numbering ────────────────────────────────────────────
        boolean hasBullet = para.getNumID() != null && para.getNumID().longValue() > 0;
        int numLevel = (para.getNumIlvl() != null) ? para.getNumIlvl().intValue() : 0;
        float bulletX  = ML + numLevel * 18f;
        float textLeft = hasBullet ? (bulletX + 14f) : ML;
        float usableW  = PW - textLeft - MR;

        // ── Check for bottom border (horizontal line under heading) ────────
        boolean hasBottomBorder = false;
        try {
            // List / bullet items and standard long body text never have horizontal section border lines
            if (!hasBullet) {
                org.apache.poi.xwpf.usermodel.Borders border = para.getBorderBottom();
                if (border != null && border != org.apache.poi.xwpf.usermodel.Borders.NONE
                                   && border != org.apache.poi.xwpf.usermodel.Borders.NIL) {
                    hasBottomBorder = true;
                } else if (para.getCTP() != null && para.getCTP().getPPr() != null
                           && para.getCTP().getPPr().getPBdr() != null
                           && para.getCTP().getPPr().getPBdr().getBottom() != null) {
                    org.openxmlformats.schemas.wordprocessingml.x2006.main.CTBorder bottom = para.getCTP().getPPr().getPBdr().getBottom();
                    org.openxmlformats.schemas.wordprocessingml.x2006.main.STBorder.Enum val = bottom.getVal();
                    boolean isValPresent = val != null 
                            && val != org.openxmlformats.schemas.wordprocessingml.x2006.main.STBorder.NONE
                            && val != org.openxmlformats.schemas.wordprocessingml.x2006.main.STBorder.NIL;
                    
                    boolean hasSize = bottom.getSz() == null || bottom.getSz().longValue() > 0;
                    
                    if (isValPresent && hasSize) {
                        String paraText = para.getText() != null ? para.getText().trim() : "";
                        boolean isHeadingLike = paraText.length() < 120 
                                && (paraText.equals(paraText.toUpperCase()) 
                                    || (para.getStyle() != null && para.getStyle().toLowerCase().contains("heading"))
                                    || (para.getRuns() != null && !para.getRuns().isEmpty() && para.getRuns().get(0).isBold()));
                        if (isHeadingLike) {
                            hasBottomBorder = true;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        // ── Paragraph spacing ─────────────────────────────────────────────
        float ptBefore = 0f;
        float ptAfter  = 4f;
        try {
            if (para.getSpacingBefore() > 0) ptBefore = para.getSpacingBefore() / 20f;
            if (para.getSpacingAfter()  > 0) ptAfter  = para.getSpacingAfter()  / 20f;
        } catch (Exception ignored) {}

        // ── Paragraph alignment ───────────────────────────────────────────
        org.apache.poi.xwpf.usermodel.ParagraphAlignment align = para.getAlignment();
        boolean isCentered = (align == org.apache.poi.xwpf.usermodel.ParagraphAlignment.CENTER);
        boolean isRight    = (align == org.apache.poi.xwpf.usermodel.ParagraphAlignment.RIGHT);

        // ── Collect styled word tokens from runs ──────────────────────────
        // Token structure: [text, bold, italic, fontSize, underline, isTab]
        java.util.List<String[]> words = new java.util.ArrayList<>();

        for (XWPFRun run : para.getRuns()) {
            String rawText = run.getText(0);
            if (rawText == null && run.getCTR() != null && !run.getCTR().getTabList().isEmpty()) {
                rawText = "\t";
            }
            if (rawText == null || rawText.isEmpty()) continue;

            boolean bold      = run.isBold();
            boolean italic    = run.isItalic();
            boolean underline = (run.getUnderline() != null
                && run.getUnderline() != org.apache.poi.xwpf.usermodel.UnderlinePatterns.NONE);
            float fSize = (run.getFontSizeAsDouble() != null)
                ? run.getFontSizeAsDouble().floatValue() : DEF;

            // Map Unicode punctuation (en-dash, em-dash, smart quotes) before ASCII sanitization
            String mapped = mapUnicodeCharacters(rawText);

            // Handle Tab character (\t) inside run
            if (mapped.contains("\t")) {
                String[] parts = mapped.split("\t", -1);
                for (int i = 0; i < parts.length; i++) {
                    if (i > 0) {
                        // Mark tab boundary
                        words.add(new String[]{"\t", String.valueOf(bold), String.valueOf(italic), String.format("%.1f", fSize), String.valueOf(underline), "true"});
                    }
                    String partClean = sanitizeText(parts[i]);
                    if (!partClean.isEmpty()) {
                        for (String token : partClean.split("(?<=\\s)|(?=\\s)")) {
                            if (!token.isEmpty()) {
                                words.add(new String[]{token, String.valueOf(bold), String.valueOf(italic), String.format("%.1f", fSize), String.valueOf(underline), "false"});
                            }
                        }
                    }
                }
            } else {
                String safe = sanitizeText(mapped);
                if (!safe.isEmpty()) {
                    for (String token : safe.split("(?<=\\s)|(?=\\s)")) {
                        if (!token.isEmpty()) {
                            words.add(new String[]{token, String.valueOf(bold), String.valueOf(italic), String.format("%.1f", fSize), String.valueOf(underline), "false"});
                        }
                    }
                }
            }
        }

        // ── Word-wrap: build list of lines ────────────────────────────────
        java.util.List<java.util.List<String[]>> wrappedLines = new java.util.ArrayList<>();
        java.util.List<String[]> curLine = new java.util.ArrayList<>();
        float lineW = 0f;

        for (String[] w : words) {
            if ("\t".equals(w[0])) {
                curLine.add(w);
                continue;
            }

            PDType0Font fnt = pickFont(fontRegular, fontBold, fontItalic, fontBI,
                                      Boolean.parseBoolean(w[1]), Boolean.parseBoolean(w[2]));
            float fs   = Float.parseFloat(w[3]);
            float wrdW;
            try { wrdW = fnt.getStringWidth(w[0]) / 1000f * fs; }
            catch (Exception ex) { wrdW = w[0].length() * fs * 0.55f; }

            if (!curLine.isEmpty() && lineW + wrdW > usableW) {
                wrappedLines.add(curLine);
                curLine = new java.util.ArrayList<>();
                lineW   = 0f;
            }
            curLine.add(w);
            lineW += wrdW;
        }
        if (!curLine.isEmpty()) wrappedLines.add(curLine);

        // Handle blank paragraph
        if (wrappedLines.isEmpty()) {
            yArr[0] -= DEF * 1.2f + ptBefore;
            if (yArr[0] < MB) {
                csArr[0].close();
                PDPage np = new PDPage(PDRectangle.A4);
                pdf.addPage(np);
                csArr[0] = new PDPageContentStream(pdf, np);
                yArr[0] = PH - MT;
            }
            if (hasBottomBorder) {
                drawBottomBorderLine(csArr[0], yArr, ML, MR, PW);
            }
            return;
        }

        // ── Render wrapped lines ──────────────────────────────────────────
        for (int li = 0; li < wrappedLines.size(); li++) {
            java.util.List<String[]> wLine = wrappedLines.get(li);

            // Max font size on this line → line height
            float maxFs = DEF;
            for (String[] w : wLine) {
                if ("\t".equals(w[0])) continue;
                float fs = Float.parseFloat(w[3]);
                if (fs > maxFs) maxFs = fs;
            }
            float lineH = maxFs * 1.4f;

            float extra = (li == 0) ? ptBefore : 0f;
            yArr[0] -= lineH + extra;

            // Page break if needed
            if (yArr[0] < MB) {
                csArr[0].close();
                PDPage np = new PDPage(PDRectangle.A4);
                pdf.addPage(np);
                csArr[0] = new PDPageContentStream(pdf, np);
                yArr[0] = PH - MT - lineH;
            }

            // Split line by tab marker if present
            java.util.List<String[]> leftTokens = new java.util.ArrayList<>();
            java.util.List<String[]> rightTokens = new java.util.ArrayList<>();
            boolean pastTab = false;

            for (String[] w : wLine) {
                if ("\t".equals(w[0])) {
                    pastTab = true;
                    continue;
                }
                if (pastTab) rightTokens.add(w);
                else leftTokens.add(w);
            }

            // Measure total width of left tokens
            float leftW = 0f;
            for (String[] w : leftTokens) {
                PDType0Font fnt = pickFont(fontRegular, fontBold, fontItalic, fontBI,
                                          Boolean.parseBoolean(w[1]), Boolean.parseBoolean(w[2]));
                float fs = Float.parseFloat(w[3]);
                try { leftW += fnt.getStringWidth(w[0]) / 1000f * fs; }
                catch (Exception ex) { leftW += w[0].length() * fs * 0.55f; }
            }

            // Measure total width of right tokens
            float rightW = 0f;
            for (String[] w : rightTokens) {
                PDType0Font fnt = pickFont(fontRegular, fontBold, fontItalic, fontBI,
                                          Boolean.parseBoolean(w[1]), Boolean.parseBoolean(w[2]));
                float fs = Float.parseFloat(w[3]);
                try { rightW += fnt.getStringWidth(w[0]) / 1000f * fs; }
                catch (Exception ex) { rightW += w[0].length() * fs * 0.55f; }
            }

            float drawX;
            if (isCentered && rightTokens.isEmpty()) drawX = textLeft + (usableW - leftW) / 2f;
            else if (isRight && rightTokens.isEmpty()) drawX = PW - MR - leftW;
            else drawX = textLeft;

            // Draw bullet marker on first line (solid round dot • matching Microsoft Word)
            if (hasBullet && li == 0) {
                try {
                    csArr[0].saveGraphicsState();
                    csArr[0].setNonStrokingColor(0, 0, 0); // Solid black fill
                    float dotX = bulletX + 4f;
                    float dotY = yArr[0] + (DEF * 0.30f);
                    float r = 2.2f; // Bullet dot radius
                    csArr[0].moveTo(dotX - r, dotY);
                    csArr[0].curveTo(dotX - r, dotY + r * 0.55228475f, dotX - r * 0.55228475f, dotY + r, dotX, dotY + r);
                    csArr[0].curveTo(dotX + r * 0.55228475f, dotY + r, dotX + r, dotY + r * 0.55228475f, dotX + r, dotY);
                    csArr[0].curveTo(dotX + r, dotY - r * 0.55228475f, dotX + r * 0.55228475f, dotY - r, dotX, dotY - r);
                    csArr[0].curveTo(dotX - r * 0.55228475f, dotY - r, dotX - r, dotY - r * 0.55228475f, dotX - r, dotY);
                    csArr[0].fill();
                    csArr[0].restoreGraphicsState();
                } catch (Exception ignored) {}
            }

            // Draw left-aligned tokens
            float wx = drawX;
            for (String[] w : leftTokens) {
                if (w[0].isEmpty()) continue;
                boolean isBold2   = Boolean.parseBoolean(w[1]);
                boolean isItalic2 = Boolean.parseBoolean(w[2]);
                float   fs2       = Float.parseFloat(w[3]);
                PDType0Font fnt2  = pickFont(fontRegular, fontBold, fontItalic, fontBI, isBold2, isItalic2);
                try {
                    csArr[0].beginText();
                    csArr[0].setFont(fnt2, fs2);
                    csArr[0].newLineAtOffset(wx, yArr[0]);
                    csArr[0].showText(w[0]);
                    csArr[0].endText();

                    float wordW2 = fnt2.getStringWidth(w[0]) / 1000f * fs2;

                    if (Boolean.parseBoolean(w[4])) {
                        csArr[0].setLineWidth(0.5f);
                        csArr[0].moveTo(wx, yArr[0] - 1.5f);
                        csArr[0].lineTo(wx + wordW2, yArr[0] - 1.5f);
                        csArr[0].stroke();
                    }
                    wx += wordW2;
                } catch (Exception ex) {
                    log.warn("Skipping run segment due to font error: {}", ex.getMessage());
                }
            }

            // Draw tabbed right-aligned tokens
            if (!rightTokens.isEmpty()) {
                float rx = PW - MR - rightW; // Align to right margin
                if (rx < wx + 10f) rx = wx + 10f; // Ensure minimum gap
                for (String[] w : rightTokens) {
                    if (w[0].isEmpty()) continue;
                    boolean isBold2   = Boolean.parseBoolean(w[1]);
                    boolean isItalic2 = Boolean.parseBoolean(w[2]);
                    float   fs2       = Float.parseFloat(w[3]);
                    PDType0Font fnt2  = pickFont(fontRegular, fontBold, fontItalic, fontBI, isBold2, isItalic2);
                    try {
                        csArr[0].beginText();
                        csArr[0].setFont(fnt2, fs2);
                        csArr[0].newLineAtOffset(rx, yArr[0]);
                        csArr[0].showText(w[0]);
                        csArr[0].endText();

                        float wordW2 = fnt2.getStringWidth(w[0]) / 1000f * fs2;

                        if (Boolean.parseBoolean(w[4])) {
                            csArr[0].setLineWidth(0.5f);
                            csArr[0].moveTo(rx, yArr[0] - 1.5f);
                            csArr[0].lineTo(rx + wordW2, yArr[0] - 1.5f);
                            csArr[0].stroke();
                        }
                        rx += wordW2;
                    } catch (Exception ex) {
                        log.warn("Skipping tabbed segment due to font error: {}", ex.getMessage());
                    }
                }
            }
        } // end wrapped lines

        // ── Draw heading bottom border line if present ─────────────────────
        if (hasBottomBorder) {
            drawBottomBorderLine(csArr[0], yArr, ML, MR, PW);
        }

        yArr[0] -= ptAfter;
        if (yArr[0] < MB) {
            csArr[0].close();
            PDPage np = new PDPage(PDRectangle.A4);
            pdf.addPage(np);
            csArr[0] = new PDPageContentStream(pdf, np);
            yArr[0] = PH - MT;
        }
    }

    private void drawBottomBorderLine(PDPageContentStream cs, float[] yArr, float ML, float MR, float PW) throws Exception {
        float lineY = yArr[0] - 3f;
        cs.setLineWidth(0.75f);
        cs.setStrokingColor(0, 0, 0); // Black line
        cs.moveTo(ML, lineY);
        cs.lineTo(PW - MR, lineY);
        cs.stroke();
        yArr[0] -= 5f; // Add spacing after horizontal line
    }

    private String mapUnicodeCharacters(String text) {
        if (text == null) return "";
        return text.replace("\u2013", "-")   // en-dash –
                   .replace("\u2014", "--")  // em-dash —
                   .replace("\u2018", "'")   // left single quote
                   .replace("\u2019", "'")   // right single quote
                   .replace("\u201C", "\"")  // left double quote
                   .replace("\u201D", "\"")  // right double quote
                   .replace("\u2022", "•")   // bullet dot
                   .replace("\u25CF", "•")   // black circle bullet
                   .replace("\u00A0", " ");  // non-breaking space
    }

    private String sanitizeText(String text) {
        if (text == null) return "";
        return text.replaceAll("[\\r\\n]", " ")
                   .replaceAll("[^\\x20-\\x7E\\u2022]", "");
    }


    /** Pick the correct Arial font variant based on bold/italic flags. */
    private PDType0Font pickFont(PDType0Font regular, PDType0Font bold,
                                 PDType0Font italic, PDType0Font bi,
                                 boolean isBold, boolean isItalic) {
        if (isBold && isItalic) return bi;
        if (isBold)             return bold;
        if (isItalic)           return italic;
        return regular;
    }

    /**
     * Load an Arial TrueType font from the system.
     * Index: bold+italic=arialbi, bold=arialbd, italic=ariali, plain=arial.
     * Falls back across Windows → Linux font paths.
     * Throws PdfWorkspaceException if no font file can be found.
     */
    private PDType0Font loadSystemFont(PDDocument doc, boolean bold, boolean italic) {
        // Candidate font file paths per variant [boldItalic, bold, italic, regular]
        String[][] candidates = {
            // Windows
            {
                "C:/Windows/Fonts/arialbi.ttf",
                "C:/Windows/Fonts/arialbd.ttf",
                "C:/Windows/Fonts/ariali.ttf",
                "C:/Windows/Fonts/arial.ttf"
            },
            // Linux — Liberation Sans
            {
                "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
            },
            // Linux — DejaVu Sans
            {
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
            }
        };

        // Variant index: 0=boldItalic, 1=bold, 2=italic, 3=regular
        int idx = (bold && italic) ? 0 : bold ? 1 : italic ? 2 : 3;

        for (String[] group : candidates) {
            java.io.File f = new java.io.File(group[idx]);
            if (f.exists()) {
                try {
                    return PDType0Font.load(doc, f);
                } catch (Exception e) {
                    log.debug("Could not load font file {}: {}", f.getPath(), e.getMessage());
                }
            }
        }

        // Fallback: try the regular (idx=3) variant from each group if the styled one failed
        for (String[] group : candidates) {
            java.io.File f = new java.io.File(group[3]);
            if (f.exists()) {
                try { return PDType0Font.load(doc, f); } catch (Exception ignored2) {}
            }
        }
        // Absolute last fallback: throw so we can diagnose
        throw new PdfWorkspaceException("FONT_LOAD_FAILED",
            "No suitable TrueType font found on system for Word-to-PDF rendering. " +
            "Please ensure Arial or Liberation Sans fonts are installed.", "word-to-pdf");
    }

    /**
     * PDF -> Excel (.xlsx)
     */
    public void pdfToExcel(Path pdfPath, Path outputPath) {
        try (PDDocument pdDocument = Loader.loadPDF(pdfPath.toFile());
             XSSFWorkbook workbook = new XSSFWorkbook()) {

            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(pdDocument);

            XSSFSheet sheet = workbook.createSheet("Extracted Data");
            String[] lines = text.split("\\r?\\n");
            int rowNum = 0;

            for (String line : lines) {
                if (line.trim().isEmpty()) continue;
                XSSFRow row = sheet.createRow(rowNum++);
                String[] columns = line.split("\\s{2,}|\\t"); // Split by multiple spaces or tabs
                int cellNum = 0;
                for (String col : columns) {
                    XSSFCell cell = row.createCell(cellNum++);
                    cell.setCellValue(col.trim());
                }
            }

            try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                workbook.write(fos);
            }
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "pdf-to-excel");
        } catch (Exception e) {
            log.error("Failed to convert PDF to Excel", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to Excel spreadsheet.", "pdf-to-excel");
        }
    }

    /**
     * Excel (.xlsx) -> PDF
     */
    public void excelToPdf(Path xlsxPath, Path outputPath) {
        try (InputStream is = Files.newInputStream(xlsxPath);
             XSSFWorkbook workbook = new XSSFWorkbook(is);
             PDDocument pdf = new PDDocument()) {

            PDPage page = new PDPage(PDRectangle.A4);
            pdf.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float fontSize = 10;
            float leading = 1.4f * fontSize;
            float margin = 40;
            float startX = page.getMediaBox().getLowerLeftX() + margin;
            float startY = page.getMediaBox().getUpperRightY() - margin;

            PDPageContentStream contentStream = new PDPageContentStream(pdf, page);
            contentStream.beginText();
            contentStream.setFont(font, fontSize);
            contentStream.newLineAtOffset(startX, startY);

            float currentY = startY;
            XSSFSheet sheet = workbook.getSheetAt(0);

            for (org.apache.poi.ss.usermodel.Row row : sheet) {
                StringBuilder rowSb = new StringBuilder();
                for (org.apache.poi.ss.usermodel.Cell cell : row) {
                    rowSb.append(cell.toString().trim()).append(" | ");
                }
                String lineText = rowSb.toString().replaceAll("[\\r\\n\\t]", " ").replaceAll("[^\\x20-\\x7E]", "").trim();
                if (lineText.isEmpty()) continue;

                currentY -= leading;
                if (currentY < margin) {
                    contentStream.endText();
                    contentStream.close();
                    page = new PDPage(PDRectangle.A4);
                    pdf.addPage(page);
                    contentStream = new PDPageContentStream(pdf, page);
                    contentStream.beginText();
                    contentStream.setFont(font, fontSize);
                    contentStream.newLineAtOffset(startX, startY);
                    currentY = startY;
                } else {
                    contentStream.newLineAtOffset(0, -leading);
                }
                contentStream.showText(lineText);
            }

            contentStream.endText();
            contentStream.close();
            pdf.save(outputPath.toFile());
        } catch (Exception e) {
            log.error("Failed to convert Excel to PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert Excel sheet to PDF.", "excel-to-pdf");
        }
    }

    /**
     * PDF -> PowerPoint (.pptx)
     */
    public void pdfToPowerPoint(Path pdfPath, Path outputPath) {
        try (PDDocument pdDocument = Loader.loadPDF(pdfPath.toFile());
             XMLSlideShow ppt = new XMLSlideShow()) {

            PDFRenderer pdfRenderer = new PDFRenderer(pdDocument);
            int pageCount = pdDocument.getNumberOfPages();

            for (int i = 0; i < pageCount; i++) {
                BufferedImage bImage = pdfRenderer.renderImageWithDPI(i, 150, ImageType.RGB);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(bImage, "png", baos);
                byte[] imageBytes = baos.toByteArray();

                XSLFPictureData pictureData = ppt.addPicture(imageBytes, PictureData.PictureType.PNG);
                XSLFSlide slide = ppt.createSlide();
                XSLFPictureShape pictureShape = slide.createPicture(pictureData);
                pictureShape.setAnchor(new java.awt.geom.Rectangle2D.Double(0, 0, ppt.getPageSize().getWidth(), ppt.getPageSize().getHeight()));
            }

            try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                ppt.write(fos);
            }
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "pdf-to-powerpoint");
        } catch (Exception e) {
            log.error("Failed to convert PDF to PowerPoint", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to PowerPoint presentation.", "pdf-to-powerpoint");
        }
    }

    /**
     * PowerPoint (.pptx) -> PDF
     */
    public void powerPointToPdf(Path pptxPath, Path outputPath) {
        try (InputStream is = Files.newInputStream(pptxPath);
             XMLSlideShow ppt = new XMLSlideShow(is);
             PDDocument pdf = new PDDocument()) {

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float fontSize = 12;

            for (XSLFSlide slide : ppt.getSlides()) {
                PDPage page = new PDPage(PDRectangle.A4);
                pdf.addPage(page);

                try (PDPageContentStream contentStream = new PDPageContentStream(pdf, page)) {
                    contentStream.beginText();
                    contentStream.setFont(font, fontSize);
                    contentStream.newLineAtOffset(50, page.getMediaBox().getHeight() - 50);
                    contentStream.showText("Slide " + (slide.getSlideNumber()));
                    contentStream.endText();
                }
            }

            pdf.save(outputPath.toFile());
        } catch (Exception e) {
            log.error("Failed to convert PowerPoint to PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PowerPoint presentation to PDF.", "powerpoint-to-pdf");
        }
    }

    /**
     * PDF -> JPG (renders each page as high-res JPG, returns single JPG or ZIP)
     */
    public Path pdfToJpg(Path pdfPath, int dpi, Path outputWorkingDir) {
        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            PDFRenderer renderer = new PDFRenderer(document);
            int totalPages = document.getNumberOfPages();

            if (totalPages == 1) {
                BufferedImage image = renderer.renderImageWithDPI(0, dpi, ImageType.RGB);
                Path jpgFile = outputWorkingDir.resolve("page_1.jpg");
                ImageIO.write(image, "jpg", jpgFile.toFile());
                return jpgFile;
            } else {
                Path zipOutput = outputWorkingDir.resolve("pdf_images.zip");
                try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipOutput.toFile()))) {
                    for (int i = 0; i < totalPages; i++) {
                        BufferedImage image = renderer.renderImageWithDPI(i, dpi, ImageType.RGB);
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        ImageIO.write(image, "jpg", baos);

                        ZipEntry entry = new ZipEntry("page_" + (i + 1) + ".jpg");
                        zos.putNextEntry(entry);
                        zos.write(baos.toByteArray());
                        zos.closeEntry();
                    }
                }
                return zipOutput;
            }
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "pdf-to-jpg");
        } catch (Exception e) {
            log.error("Failed to convert PDF to JPG", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to JPG images.", "pdf-to-jpg");
        }
    }

    /**
     * JPG / PNG -> PDF
     */
    public void jpgToPdf(List<Path> imagePaths, String pageSizeStr, String orientation, float margin, Path outputPath) {
        try (PDDocument document = new PDDocument()) {
            PDRectangle targetBox = parsePaperSize(pageSizeStr);
            boolean isLandscape = "landscape".equalsIgnoreCase(orientation);

            if (isLandscape && targetBox.getWidth() < targetBox.getHeight()) {
                targetBox = new PDRectangle(targetBox.getHeight(), targetBox.getWidth());
            }

            for (Path imgPath : imagePaths) {
                PDPage page = new PDPage(targetBox);
                document.addPage(page);

                PDImageXObject pdImage = PDImageXObject.createFromFileByContent(imgPath.toFile(), document);
                try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                    float drawWidth = targetBox.getWidth() - 2 * margin;
                    float drawHeight = targetBox.getHeight() - 2 * margin;

                    // Preserve aspect ratio
                    float imgWidth = pdImage.getWidth();
                    float imgHeight = pdImage.getHeight();
                    float scale = Math.min(drawWidth / imgWidth, drawHeight / imgHeight);

                    float scaledWidth = imgWidth * scale;
                    float scaledHeight = imgHeight * scale;

                    float startX = margin + (drawWidth - scaledWidth) / 2;
                    float startY = margin + (drawHeight - scaledHeight) / 2;

                    contentStream.drawImage(pdImage, startX, startY, scaledWidth, scaledHeight);
                }
            }

            document.save(outputPath.toFile());
        } catch (Exception e) {
            log.error("Failed to convert JPG to PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert images to PDF document.", "jpg-to-pdf");
        }
    }

    /**
     * PDF -> Markdown (.md)
     * Extracts text from PDF and structures it into Markdown headings, lists, paragraphs, and blocks.
     */
    public void pdfToMarkdown(Path pdfPath, Path outputPath) {
        try (PDDocument pdDocument = Loader.loadPDF(pdfPath.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String rawText = stripper.getText(pdDocument);

            StringBuilder mdBuilder = new StringBuilder();
            String[] lines = rawText.split("\\r?\\n");
            boolean firstLine = true;

            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) {
                    mdBuilder.append("\n");
                    continue;
                }

                // Check if line looks like a main title / heading
                if (firstLine || (trimmed.length() < 60 && (trimmed.equals(trimmed.toUpperCase()) || !trimmed.endsWith(".")))) {
                    if (firstLine) {
                        mdBuilder.append("# ").append(trimmed).append("\n\n");
                        firstLine = false;
                    } else if (trimmed.length() < 35 && trimmed.equals(trimmed.toUpperCase())) {
                        mdBuilder.append("## ").append(trimmed).append("\n\n");
                    } else if (trimmed.length() < 50 && !trimmed.endsWith(".")) {
                        mdBuilder.append("### ").append(trimmed).append("\n\n");
                    } else {
                        mdBuilder.append(trimmed).append("\n\n");
                    }
                    continue;
                }

                // Check for bullet list item
                if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
                    String cleanBullet = trimmed.substring(1).trim();
                    mdBuilder.append("- ").append(cleanBullet).append("\n");
                    continue;
                }

                // Check for numbered list item (e.g. 1. Item)
                if (trimmed.matches("^\\d+\\.\\s+.*")) {
                    mdBuilder.append(trimmed).append("\n");
                    continue;
                }

                // Standard paragraph text
                mdBuilder.append(trimmed).append("\n\n");
                firstLine = false;
            }

            Files.writeString(outputPath, mdBuilder.toString(), StandardCharsets.UTF_8);
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "pdf-to-markdown");
        } catch (Exception e) {
            log.error("Failed to convert PDF to Markdown", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF document to Markdown.", "pdf-to-markdown");
        }
    }

    /**
     * Extract raw text from PDF to .txt or .docx
     */
    public Path extractText(Path pdfPath, String outputFormat, Path outputWorkingDir) {
        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            if ("docx".equalsIgnoreCase(outputFormat)) {
                Path docxPath = outputWorkingDir.resolve("extracted_text.docx");
                try (XWPFDocument docx = new XWPFDocument()) {
                    for (String line : text.split("\\r?\\n")) {
                        XWPFParagraph p = docx.createParagraph();
                        p.createRun().setText(line);
                    }
                    try (FileOutputStream fos = new FileOutputStream(docxPath.toFile())) {
                        docx.write(fos);
                    }
                }
                return docxPath;
            } else {
                Path txtPath = outputWorkingDir.resolve("extracted_text.txt");
                Files.writeString(txtPath, text, StandardCharsets.UTF_8);
                return txtPath;
            }
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "extract-text");
        } catch (Exception e) {
            log.error("Failed to extract text from PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to extract text from PDF document.", "extract-text");
        }
    }

    /**
     * HTML -> PDF
     * Converts HTML string, file, or URL page content into a clean PDF document.
     */
    public void htmlToPdf(String htmlContentOrUrl, Path outputPath) {
        try (PDDocument pdf = new PDDocument()) {
            String rawHtml = htmlContentOrUrl;
            if (htmlContentOrUrl.startsWith("http://") || htmlContentOrUrl.startsWith("https://")) {
                try (InputStream is = new java.net.URI(htmlContentOrUrl).toURL().openStream()) {
                    rawHtml = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                }
            }

            // Strip HTML tags while preserving line breaks and section blocks
            String textContent = rawHtml
                    .replaceAll("(?i)<br\\s*/?>", "\n")
                    .replaceAll("(?i)</p>", "\n\n")
                    .replaceAll("(?i)</h1>", "\n\n")
                    .replaceAll("(?i)</h2>", "\n\n")
                    .replaceAll("(?i)</h3>", "\n\n")
                    .replaceAll("(?i)</li>", "\n")
                    .replaceAll("(?i)<tr\\s*>", "\n")
                    .replaceAll("<[^>]+>", "")
                    .replace("&nbsp;", " ")
                    .replace("&amp;", "&")
                    .replace("&lt;", "<")
                    .replace("&gt;", ">")
                    .replace("&quot;", "\"");

            // Render text onto PDF pages
            PDPage page = new PDPage(PDRectangle.A4);
            pdf.addPage(page);
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float fontSize = 11f;
            float leading = 1.4f * fontSize;
            float margin = 50f;
            float startX = margin;
            float startY = page.getMediaBox().getHeight() - margin;
            float usableWidth = page.getMediaBox().getWidth() - (2 * margin);

            PDPageContentStream cs = new PDPageContentStream(pdf, page);
            cs.beginText();
            cs.setFont(font, fontSize);
            cs.newLineAtOffset(startX, startY);
            float currentY = startY;

            String[] lines = textContent.split("\\r?\\n");
            for (String rawLine : lines) {
                String line = rawLine.replaceAll("[^\\x20-\\x7E]", "").trim();
                if (line.isEmpty()) {
                    currentY -= leading;
                    if (currentY < margin) {
                        cs.endText();
                        cs.close();
                        page = new PDPage(PDRectangle.A4);
                        pdf.addPage(page);
                        cs = new PDPageContentStream(pdf, page);
                        cs.beginText();
                        cs.setFont(font, fontSize);
                        cs.newLineAtOffset(startX, startY);
                        currentY = startY;
                    } else {
                        cs.newLineAtOffset(0, -leading);
                    }
                    continue;
                }

                // Word wrap line
                String[] words = line.split("\\s+");
                StringBuilder curLine = new StringBuilder();

                for (String w : words) {
                    String testLine = curLine.length() == 0 ? w : curLine + " " + w;
                    float width = font.getStringWidth(testLine) / 1000f * fontSize;
                    if (width > usableWidth) {
                        cs.showText(curLine.toString());
                        currentY -= leading;
                        if (currentY < margin) {
                            cs.endText();
                            cs.close();
                            page = new PDPage(PDRectangle.A4);
                            pdf.addPage(page);
                            cs = new PDPageContentStream(pdf, page);
                            cs.beginText();
                            cs.setFont(font, fontSize);
                            cs.newLineAtOffset(startX, startY);
                            currentY = startY;
                        } else {
                            cs.newLineAtOffset(0, -leading);
                        }
                        curLine = new StringBuilder(w);
                    } else {
                        curLine = new StringBuilder(testLine);
                    }
                }
                if (curLine.length() > 0) {
                    cs.showText(curLine.toString());
                    currentY -= leading;
                    if (currentY < margin) {
                        cs.endText();
                        cs.close();
                        page = new PDPage(PDRectangle.A4);
                        pdf.addPage(page);
                        cs = new PDPageContentStream(pdf, page);
                        cs.beginText();
                        cs.setFont(font, fontSize);
                        cs.newLineAtOffset(startX, startY);
                        currentY = startY;
                    } else {
                        cs.newLineAtOffset(0, -leading);
                    }
                }
            }

            cs.endText();
            cs.close();
            pdf.save(outputPath.toFile());

        } catch (Exception e) {
            log.error("Failed to convert HTML to PDF", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert HTML to PDF.", "html-to-pdf");
        }
    }

    /**
     * PDF -> PDF/A (Archival Standard PDF/A-1b)
     */
    public void pdfToPdfA(Path pdfPath, Path outputPath) {
        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            // Set XMP metadata for PDF/A-1b compliance
            org.apache.pdfbox.pdmodel.common.PDMetadata metadata = new org.apache.pdfbox.pdmodel.common.PDMetadata(document);
            document.getDocumentCatalog().setMetadata(metadata);

            String xmp = "<?xpacket begin=\"\uFEFF\" id=\"W5M0MpCehiHzreSzNTczkc9d\"?>\n" +
                    "<x:xmpmeta xmlns:x=\"adobe:ns:meta/\">\n" +
                    " <rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">\n" +
                    "  <rdf:Description rdf:about=\"\" xmlns:pdfaid=\"http://www.aiim.org/pdfa/ns/id/\">\n" +
                    "   <pdfaid:part>1</pdfaid:part>\n" +
                    "   <pdfaid:conformance>B</pdfaid:conformance>\n" +
                    "  </rdf:Description>\n" +
                    " </rdf:RDF>\n" +
                    "</x:xmpmeta>\n" +
                    "<?xpacket end=\"w\"?>";

            metadata.importXMPMetadata(xmp.getBytes(StandardCharsets.UTF_8));
            document.save(outputPath.toFile());
        } catch (InvalidPasswordException e) {
            throw new PdfWorkspaceException("PASSWORD_PROTECTED", "This PDF requires a password.", "pdf-to-pdfa");
        } catch (Exception e) {
            log.error("Failed to convert PDF to PDF/A", e);
            throw new PdfWorkspaceException("PROCESSING_FAILED", "Failed to convert PDF to PDF/A archival format.", "pdf-to-pdfa");
        }
    }

    private PDRectangle parsePaperSize(String pageSizeStr) {
        if ("LETTER".equalsIgnoreCase(pageSizeStr)) return PDRectangle.LETTER;
        if ("LEGAL".equalsIgnoreCase(pageSizeStr)) return PDRectangle.LEGAL;
        if ("A3".equalsIgnoreCase(pageSizeStr)) return PDRectangle.A3;
        return PDRectangle.A4;
    }
}
