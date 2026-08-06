package com.pdfworkspace.repository;

import com.pdfworkspace.entity.ToolRunHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ToolRunHistoryRepository extends JpaRepository<ToolRunHistory, UUID> {
    Page<ToolRunHistory> findByToolKey(String toolKey, Pageable pageable);
}
