package com.pdfworkspace.service;

import com.pdfworkspace.dto.feature.FeatureFlagDto;
import com.pdfworkspace.entity.FeatureFlag;
import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.repository.FeatureFlagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeatureFlagService {

    private final FeatureFlagRepository featureFlagRepository;

    @jakarta.annotation.PostConstruct
    @Transactional
    public void initMissingFeatureFlags() {
        List<FeatureFlag> defaultTools = List.of(
            FeatureFlag.builder().toolKey("pdf-to-markdown").name("PDF to Markdown").description("Extract PDF document text into structured Markdown (.md) format.").category("CONVERSION").enabled(true).build(),
            FeatureFlag.builder().toolKey("scan-to-pdf").name("Scan to PDF").description("Capture photos using webcam or phone camera and convert into a PDF document.").category("CONVERSION").enabled(true).build(),
            FeatureFlag.builder().toolKey("html-to-pdf").name("HTML to PDF").description("Convert HTML files or website URLs into clean PDF documents.").category("CONVERSION").enabled(true).build(),
            FeatureFlag.builder().toolKey("pdf-to-pdfa").name("PDF to PDF/A").description("Convert PDF documents into ISO PDF/A-1b archival standard format.").category("CONVERSION").enabled(true).build(),
            FeatureFlag.builder().toolKey("ai-summary").name("AI Summarizer").description("Analyze PDF documents and generate executive summaries, key bullet points, and action items.").category("CONVERSION").enabled(true).build(),
            FeatureFlag.builder().toolKey("translate").name("Translate PDF").description("Extract PDF text and translate document into your target language of choice.").category("CONVERSION").enabled(true).build(),
            FeatureFlag.builder().toolKey("pdf-forms").name("PDF Forms").description("Add fillable text fields and interactive checkboxes to PDF documents.").category("CONVERSION").enabled(true).build(),
            FeatureFlag.builder().toolKey("edit-pdf").name("Edit PDF").description("Add text overlays, draw highlights, insert stamps, and annotate PDF pages visually.").category("ANNOTATION").enabled(true).build()
        );

        for (FeatureFlag tool : defaultTools) {
            if (featureFlagRepository.findByToolKey(tool.getToolKey()).isEmpty()) {
                featureFlagRepository.save(tool);
            }
        }
    }

    @Transactional
    public void validateToolEnabled(String toolKey) {
        // Special case for test/echo pipe
        if ("echo".equalsIgnoreCase(toolKey)) {
            return;
        }

        FeatureFlag flag = featureFlagRepository.findByToolKey(toolKey)
                .orElseGet(() -> {
                    FeatureFlag newFlag = FeatureFlag.builder()
                            .toolKey(toolKey)
                            .name(toolKey.replace('-', ' ').toUpperCase())
                            .description("PDF Tool Feature: " + toolKey)
                            .category("CONVERSION")
                            .enabled(true)
                            .build();
                    return featureFlagRepository.save(newFlag);
                });

        if (!Boolean.TRUE.equals(flag.getEnabled())) {
            throw new PdfWorkspaceException("FEATURE_DISABLED", "The requested PDF tool [" + flag.getName() + "] is currently disabled by administrator.", toolKey);
        }
    }

    @Transactional(readOnly = true)
    public List<FeatureFlagDto> getAllEnabledFeatures() {
        return featureFlagRepository.findByEnabledTrue().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FeatureFlagDto> getAllFeatures() {
        return featureFlagRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public FeatureFlagDto createFeature(FeatureFlagDto dto) {
        if (dto.getToolKey() == null || dto.getToolKey().trim().isEmpty()) {
            throw new PdfWorkspaceException("INVALID_INPUT", "Tool key is required.");
        }
        if (featureFlagRepository.findByToolKey(dto.getToolKey().trim().toLowerCase()).isPresent()) {
            throw new PdfWorkspaceException("ALREADY_EXISTS", "A feature with tool key '" + dto.getToolKey() + "' already exists.");
        }

        FeatureFlag flag = FeatureFlag.builder()
                .toolKey(dto.getToolKey().trim().toLowerCase())
                .name(dto.getName())
                .description(dto.getDescription())
                .category(dto.getCategory() != null ? dto.getCategory() : "PAGE_OPERATIONS")
                .enabled(dto.getEnabled() != null ? dto.getEnabled() : true)
                .maxFileSizeMb(dto.getMaxFileSizeMb() != null ? dto.getMaxFileSizeMb() : 100)
                .build();

        FeatureFlag saved = featureFlagRepository.save(flag);
        return mapToDto(saved);
    }

    @Transactional
    public FeatureFlagDto toggleFeature(String toolKey, boolean enabled) {
        FeatureFlag flag = featureFlagRepository.findByToolKey(toolKey)
                .orElseThrow(() -> new PdfWorkspaceException("NOT_FOUND", "Tool not found with key: " + toolKey));
        flag.setEnabled(enabled);
        FeatureFlag saved = featureFlagRepository.save(flag);
        return mapToDto(saved);
    }

    public FeatureFlagDto mapToDto(FeatureFlag flag) {
        return FeatureFlagDto.builder()
                .id(flag.getId())
                .toolKey(flag.getToolKey())
                .name(flag.getName())
                .description(flag.getDescription())
                .category(flag.getCategory())
                .enabled(flag.getEnabled())
                .maxFileSizeMb(flag.getMaxFileSizeMb())
                .build();
    }
}
