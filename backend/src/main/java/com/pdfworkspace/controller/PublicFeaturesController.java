package com.pdfworkspace.controller;

import com.pdfworkspace.dto.feature.FeatureFlagDto;
import com.pdfworkspace.service.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/features")
@RequiredArgsConstructor
public class PublicFeaturesController {

    private final FeatureFlagService featureFlagService;

    @GetMapping
    public ResponseEntity<List<FeatureFlagDto>> getEnabledFeatures() {
        return ResponseEntity.ok(featureFlagService.getAllEnabledFeatures());
    }
}
