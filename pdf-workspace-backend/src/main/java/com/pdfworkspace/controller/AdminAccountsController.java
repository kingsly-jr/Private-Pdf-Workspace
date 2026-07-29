package com.pdfworkspace.controller;

import com.pdfworkspace.dto.admin.CreateAdminRequest;
import com.pdfworkspace.dto.auth.AdminUserDto;
import com.pdfworkspace.service.AdminAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
public class AdminAccountsController {

    private final AdminAccountService adminAccountService;

    @GetMapping
    public ResponseEntity<List<AdminUserDto>> getAllAdmins() {
        return ResponseEntity.ok(adminAccountService.getAllAdmins());
    }

    @PostMapping
    public ResponseEntity<AdminUserDto> createAdmin(@Valid @RequestBody CreateAdminRequest request) {
        return ResponseEntity.ok(adminAccountService.createAdmin(request));
    }

    @PutMapping("/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable("id") UUID id,
            @RequestParam("newPassword") String newPassword) {
        adminAccountService.resetAdminPassword(id, newPassword);
        return ResponseEntity.ok().build();
    }
}
