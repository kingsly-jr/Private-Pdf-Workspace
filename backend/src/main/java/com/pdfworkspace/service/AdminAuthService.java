package com.pdfworkspace.service;

import com.pdfworkspace.config.JwtTokenProvider;
import com.pdfworkspace.dto.auth.AdminUserDto;
import com.pdfworkspace.dto.auth.ChangePasswordRequest;
import com.pdfworkspace.dto.auth.LoginRequest;
import com.pdfworkspace.dto.auth.LoginResponse;
import com.pdfworkspace.entity.AdminUser;
import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedDefaultAdminIfEmpty() {
        String defaultUsername = "admin";
        String defaultPassword = "pass@123";
        String defaultEmail = "admin@roririworkspace.internal";

        AdminUser admin = adminUserRepository.findByUsername(defaultUsername).orElse(null);
        if (admin == null) {
            AdminUser seedAdmin = AdminUser.builder()
                    .username(defaultUsername)
                    .email(defaultEmail)
                    .passwordHash(passwordEncoder.encode(defaultPassword))
                    .role("ROLE_ADMIN")
                    .mustChangePassword(false)
                    .build();

            adminUserRepository.save(seedAdmin);

            log.info("==================================================================");
            log.info("  [SECURITY NOTICE] Seeded Initial Admin Account");
            log.info("  Username : {}", defaultUsername);
            log.info("  Password : {}", defaultPassword);
            log.info("==================================================================");
        } else {
            admin.setPasswordHash(passwordEncoder.encode(defaultPassword));
            admin.setMustChangePassword(false);
            adminUserRepository.save(admin);
            log.info("==================================================================");
            log.info("  [SECURITY NOTICE] Updated Admin Password for 'admin' to '{}'", defaultPassword);
            log.info("==================================================================");
        }
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String username = request.getUsername() != null ? request.getUsername().trim() : "";
        String password = request.getPassword() != null ? request.getPassword().trim() : "";

        AdminUser admin = adminUserRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new PdfWorkspaceException("INVALID_CREDENTIALS", "Invalid username or password"));

        if (!passwordEncoder.matches(password, admin.getPasswordHash())) {
            throw new PdfWorkspaceException("INVALID_CREDENTIALS", "Invalid username or password");
        }

        String token = tokenProvider.generateToken(admin.getUsername(), admin.getRole());

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(mapToDto(admin))
                .build();
    }

    @Transactional
    public AdminUserDto changePassword(AdminUser adminUser, ChangePasswordRequest request) {
        if (adminUser == null) {
            throw new PdfWorkspaceException("UNAUTHORIZED", "Authentication required");
        }
        return changePassword(adminUser.getUsername(), request);
    }

    @Transactional
    public AdminUserDto changePassword(String username, ChangePasswordRequest request) {
        AdminUser admin = adminUserRepository.findByUsername(username)
                .orElseThrow(() -> new PdfWorkspaceException("NOT_FOUND", "Admin user not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), admin.getPasswordHash())) {
            throw new PdfWorkspaceException("INVALID_CREDENTIALS", "Current password is incorrect");
        }

        admin.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        admin.setMustChangePassword(false);
        AdminUser updated = adminUserRepository.save(admin);

        return mapToDto(updated);
    }

    public AdminUserDto mapToDto(AdminUser entity) {
        if (entity == null) return null;
        return AdminUserDto.builder()
                .id(entity.getId())
                .username(entity.getUsername())
                .email(entity.getEmail())
                .role(entity.getRole())
                .mustChangePassword(entity.getMustChangePassword())
                .build();
    }
}
