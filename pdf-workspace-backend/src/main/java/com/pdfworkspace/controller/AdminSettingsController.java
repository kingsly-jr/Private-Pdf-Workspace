package com.pdfworkspace.controller;

import com.pdfworkspace.entity.AppSetting;
import com.pdfworkspace.service.AppSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final AppSettingService appSettingService;

    @GetMapping
    public ResponseEntity<List<AppSetting>> getSettings() {
        return ResponseEntity.ok(appSettingService.getAllSettings());
    }

    @PutMapping
    public ResponseEntity<Void> updateSettings(@RequestBody Map<String, String> settingsMap) {
        appSettingService.updateSettings(settingsMap);
        return ResponseEntity.ok().build();
    }
}
