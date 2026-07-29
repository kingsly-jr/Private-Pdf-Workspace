package com.pdfworkspace.dto.feature;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeatureFlagDto {
    private UUID id;
    private String toolKey;
    private String name;
    private String description;
    private String category;
    private Boolean enabled;
    private Integer maxFileSizeMb;
}
