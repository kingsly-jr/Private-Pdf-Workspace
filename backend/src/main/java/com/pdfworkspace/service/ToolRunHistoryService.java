package com.pdfworkspace.service;

import com.pdfworkspace.entity.ToolRunHistory;
import com.pdfworkspace.repository.ToolRunHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ToolRunHistoryService {

    private final ToolRunHistoryRepository historyRepository;

    @Transactional
    public void recordRun(String toolKey, String status, int fileCount, long inputSizeBytes, long outputSizeBytes, long durationMs, String errorCode) {
        try {
            ToolRunHistory entry = ToolRunHistory.builder()
                    .toolKey(toolKey)
                    .status(status)
                    .fileCount(fileCount)
                    .inputSizeBytes(inputSizeBytes)
                    .outputSizeBytes(outputSizeBytes)
                    .durationMs(durationMs)
                    .errorCode(errorCode)
                    .build();
            historyRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to record tool run history for tool [{}]", toolKey, e);
        }
    }
}
