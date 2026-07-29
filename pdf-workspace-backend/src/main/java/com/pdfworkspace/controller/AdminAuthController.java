package com.pdfworkspace.controller;

import com.pdfworkspace.dto.auth.AdminUserDto;
import com.pdfworkspace.dto.auth.ChangePasswordRequest;
import com.pdfworkspace.dto.auth.LoginRequest;
import com.pdfworkspace.dto.auth.LoginResponse;
import com.pdfworkspace.entity.AdminUser;
import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.service.AdminAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(adminAuthService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<AdminUserDto> getCurrentUser(@AuthenticationPrincipal AdminUser adminUser) {
        if (adminUser == null) {
            throw new PdfWorkspaceException("UNAUTHORIZED", "Authentication required");
        }
        return ResponseEntity.ok(adminAuthService.mapToDto(adminUser));
    }

    @PostMapping("/change-password")
    public ResponseEntity<AdminUserDto> changePassword(
            @AuthenticationPrincipal AdminUser adminUser,
            @Valid @RequestBody ChangePasswordRequest request) {
        String username = adminUser != null ? adminUser.getUsername() : "admin";
        return ResponseEntity.ok(adminAuthService.changePassword(username, request));
    }
}
