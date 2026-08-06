package com.pdfworkspace.controller;

import com.pdfworkspace.dto.feature.FeatureFlagDto;
import com.pdfworkspace.service.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/features")
@RequiredArgsConstructor
public class AdminFeaturesController {

    private final FeatureFlagService featureFlagService;

    @GetMapping
    public ResponseEntity<List<FeatureFlagDto>> getAllFeatures() {
        return ResponseEntity.ok(featureFlagService.getAllFeatures());
    }

    @PostMapping
    public ResponseEntity<FeatureFlagDto> createFeature(@RequestBody FeatureFlagDto dto) {
        return ResponseEntity.ok(featureFlagService.createFeature(dto));
    }

    @PutMapping("/{toolKey}/toggle")
    public ResponseEntity<FeatureFlagDto> toggleFeature(
            @PathVariable("toolKey") String toolKey,
            @RequestParam("enabled") boolean enabled) {
        return ResponseEntity.ok(featureFlagService.toggleFeature(toolKey, enabled));
    }
}
