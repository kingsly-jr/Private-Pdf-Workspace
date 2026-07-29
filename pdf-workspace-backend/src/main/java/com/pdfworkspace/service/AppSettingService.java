package com.pdfworkspace.service;

import com.pdfworkspace.entity.AppSetting;
import com.pdfworkspace.repository.AppSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AppSettingService {

    private final AppSettingRepository appSettingRepository;

    @Transactional(readOnly = true)
    public List<AppSetting> getAllSettings() {
        return appSettingRepository.findAll();
    }

    @Transactional
    public void updateSettings(Map<String, String> settingsMap) {
        settingsMap.forEach((key, val) -> {
            AppSetting setting = appSettingRepository.findById(key)
                    .orElse(AppSetting.builder().key(key).value(val).build());
            setting.setValue(val);
            appSettingRepository.save(setting);
        });
    }
}
