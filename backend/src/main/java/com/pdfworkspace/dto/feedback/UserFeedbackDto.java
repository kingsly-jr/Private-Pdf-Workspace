package com.pdfworkspace.dto.feedback;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFeedbackDto {
    private UUID id;
    private String name;
    private String email;
    private Integer rating;
    private String category;
    private String message;
    private Boolean isRead;
    private Instant createdAt;
}
