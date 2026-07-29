package com.pdfworkspace.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "feature_flags")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeatureFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tool_key", nullable = false, unique = true, length = 50)
    private String toolKey;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "max_file_size_mb", nullable = false)
    @Builder.Default
    private Integer maxFileSizeMb = 100;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
