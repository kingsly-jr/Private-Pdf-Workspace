package com.pdfworkspace.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSummaryResponseDto {
    private String fileName;
    private int pageCount;
    private int wordCount;
    private String executiveSummary;
    private List<String> bulletPoints;
    private List<String> keywords;
    private List<String> actionItems;
    private String rawMarkdown;
}
