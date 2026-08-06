package com.pdfworkspace.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tool_run_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolRunHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tool_key", nullable = false, length = 50)
    private String toolKey;

    @Column(nullable = false, length = 20)
    private String status; // 'SUCCESS', 'FAILED', 'REJECTED'

    @Column(name = "file_count", nullable = false)
    @Builder.Default
    private Integer fileCount = 1;

    @Column(name = "input_size_bytes")
    @Builder.Default
    private Long inputSizeBytes = 0L;

    @Column(name = "output_size_bytes")
    @Builder.Default
    private Long outputSizeBytes = 0L;

    @Column(name = "duration_ms")
    @Builder.Default
    private Long durationMs = 0L;

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
