package com.pdfworkspace.controller;

import com.pdfworkspace.entity.ToolRunHistory;
import com.pdfworkspace.repository.ToolRunHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/history")
@RequiredArgsConstructor
public class AdminHistoryController {

    private final ToolRunHistoryRepository historyRepository;

    @GetMapping
    public ResponseEntity<Page<ToolRunHistory>> getHistory(
            @RequestParam(value = "toolKey", required = false) String toolKey,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (toolKey != null && !toolKey.isBlank() && !"ALL".equalsIgnoreCase(toolKey)) {
            return ResponseEntity.ok(historyRepository.findByToolKey(toolKey, pageable));
        }

        return ResponseEntity.ok(historyRepository.findAll(pageable));
    }
}
