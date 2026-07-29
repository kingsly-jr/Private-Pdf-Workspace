package com.pdfworkspace.service;

import com.pdfworkspace.dto.feedback.FeedbackSubmitRequest;
import com.pdfworkspace.dto.feedback.UserFeedbackDto;
import com.pdfworkspace.entity.UserFeedback;
import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.repository.UserFeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserFeedbackService {

    private final UserFeedbackRepository feedbackRepository;

    @Transactional
    public UserFeedbackDto submitFeedback(FeedbackSubmitRequest request) {
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new PdfWorkspaceException("INVALID_INPUT", "Feedback message cannot be empty.");
        }

        UserFeedback feedback = UserFeedback.builder()
                .name(request.getName() != null && !request.getName().trim().isEmpty() ? request.getName().trim() : "Anonymous User")
                .email(request.getEmail() != null ? request.getEmail().trim() : "")
                .rating(request.getRating() != null ? Math.max(1, Math.min(5, request.getRating())) : 5)
                .category(request.getCategory() != null ? request.getCategory().trim().toUpperCase() : "GENERAL")
                .message(request.getMessage().trim())
                .isRead(false)
                .build();

        UserFeedback saved = feedbackRepository.save(feedback);
        log.info("Received public user feedback from [{}], category: [{}]", saved.getName(), saved.getCategory());
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<UserFeedbackDto> getAllFeedbacks() {
        return feedbackRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        return feedbackRepository.countByIsReadFalse();
    }

    @Transactional
    public UserFeedbackDto markAsRead(UUID id) {
        UserFeedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new PdfWorkspaceException("NOT_FOUND", "Feedback entry not found: " + id));
        feedback.setIsRead(true);
        UserFeedback updated = feedbackRepository.save(feedback);
        return mapToDto(updated);
    }

    @Transactional
    public void deleteFeedback(UUID id) {
        if (!feedbackRepository.existsById(id)) {
            throw new PdfWorkspaceException("NOT_FOUND", "Feedback entry not found: " + id);
        }
        feedbackRepository.deleteById(id);
    }

    public UserFeedbackDto mapToDto(UserFeedback entity) {
        if (entity == null) return null;
        return UserFeedbackDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .email(entity.getEmail())
                .rating(entity.getRating())
                .category(entity.getCategory())
                .message(entity.getMessage())
                .isRead(entity.getIsRead())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
