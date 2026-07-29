package com.pdfworkspace.controller;

import com.pdfworkspace.dto.feedback.UserFeedbackDto;
import com.pdfworkspace.service.UserFeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/feedback")
@RequiredArgsConstructor
public class AdminFeedbackController {

    private final UserFeedbackService feedbackService;

    @GetMapping
    public ResponseEntity<List<UserFeedbackDto>> getAllFeedbacks() {
        return ResponseEntity.ok(feedbackService.getAllFeedbacks());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("unreadCount", feedbackService.getUnreadCount()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<UserFeedbackDto> markAsRead(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(feedbackService.markAsRead(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFeedback(@PathVariable("id") UUID id) {
        feedbackService.deleteFeedback(id);
        return ResponseEntity.noContent().build();
    }
}
