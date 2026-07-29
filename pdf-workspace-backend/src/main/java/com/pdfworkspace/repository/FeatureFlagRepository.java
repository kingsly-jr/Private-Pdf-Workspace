package com.pdfworkspace.repository;

import com.pdfworkspace.entity.FeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, UUID> {
    Optional<FeatureFlag> findByToolKey(String toolKey);
    List<FeatureFlag> findByEnabledTrue();
}
