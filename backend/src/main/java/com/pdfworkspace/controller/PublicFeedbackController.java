package com.pdfworkspace.controller;

import com.pdfworkspace.dto.feedback.FeedbackSubmitRequest;
import com.pdfworkspace.dto.feedback.UserFeedbackDto;
import com.pdfworkspace.service.UserFeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class PublicFeedbackController {

    private final UserFeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<UserFeedbackDto> submitFeedback(@Valid @RequestBody FeedbackSubmitRequest request) {
        return ResponseEntity.ok(feedbackService.submitFeedback(request));
    }
}
