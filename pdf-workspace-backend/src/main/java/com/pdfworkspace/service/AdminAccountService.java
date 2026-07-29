package com.pdfworkspace.service;

import com.pdfworkspace.dto.admin.CreateAdminRequest;
import com.pdfworkspace.dto.auth.AdminUserDto;
import com.pdfworkspace.entity.AdminUser;
import com.pdfworkspace.exception.PdfWorkspaceException;
import com.pdfworkspace.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminAccountService {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuthService adminAuthService;

    @Transactional(readOnly = true)
    public List<AdminUserDto> getAllAdmins() {
        return adminUserRepository.findAll().stream()
                .map(adminAuthService::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AdminUserDto createAdmin(CreateAdminRequest request) {
        if (adminUserRepository.existsByUsername(request.getUsername())) {
            throw new PdfWorkspaceException("DUPLICATE_USERNAME", "Username is already registered.");
        }

        AdminUser newAdmin = AdminUser.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("ROLE_ADMIN")
                .mustChangePassword(true)
                .build();

        AdminUser saved = adminUserRepository.save(newAdmin);
        return adminAuthService.mapToDto(saved);
    }

    @Transactional
    public void resetAdminPassword(UUID id, String newPassword) {
        AdminUser admin = adminUserRepository.findById(id)
                .orElseThrow(() -> new PdfWorkspaceException("NOT_FOUND", "Admin account not found."));

        admin.setPasswordHash(passwordEncoder.encode(newPassword));
        admin.setMustChangePassword(true);
        adminUserRepository.save(admin);
    }
}
