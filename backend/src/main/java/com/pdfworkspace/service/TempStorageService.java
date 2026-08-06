package com.pdfworkspace.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
public class TempStorageService {

    @Value("${app.storage.temp-dir:${java.io.tmpdir}/pdf-workspace-temp}")
    private String tempDirRoot;

    @Value("${app.storage.temp-file-ttl-minutes:15}")
    private long tempFileTtlMinutes;

    private Path rootPath;

    @PostConstruct
    public void init() {
        try {
            this.rootPath = Paths.get(tempDirRoot);
            Files.createDirectories(this.rootPath);
            log.info("Initialized Temp Storage Root at: {}", this.rootPath.toAbsolutePath());
        } catch (IOException e) {
            log.error("Could not initialize temporary storage directory", e);
            throw new RuntimeException("Failed to initialize temp storage root", e);
        }
    }

    public Path createWorkingDir() throws IOException {
        String uuid = UUID.randomUUID().toString();
        Path workingDir = rootPath.resolve(uuid);
        Files.createDirectories(workingDir);
        return workingDir;
    }

    public Path saveFile(MultipartFile file, Path targetDir) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String safeFilename = (originalFilename != null && !originalFilename.isBlank())
                ? Paths.get(originalFilename).getFileName().toString()
                : "uploaded_file.pdf";

        Path destinationPath = targetDir.resolve(safeFilename);
        Files.copy(file.getInputStream(), destinationPath, StandardCopyOption.REPLACE_EXISTING);
        return destinationPath;
    }

    public void purgeDirectory(Path workingDir) {
        if (workingDir == null || !Files.exists(workingDir)) {
            return;
        }
        try {
            FileSystemUtils.deleteRecursively(workingDir);
            log.debug("Successfully purged working directory: {}", workingDir.getFileName());
        } catch (IOException e) {
            log.warn("Failed to purge working directory: {}", workingDir, e);
        }
    }

    @Scheduled(cron = "0 */15 * * * *")
    public void cleanupOrphanedDirectories() {
        if (rootPath == null || !Files.exists(rootPath)) {
            return;
        }

        Instant cutoff = Instant.now().minus(tempFileTtlMinutes, ChronoUnit.MINUTES);
        log.info("Starting scheduled cleanup sweep for temp directories older than {} minutes...", tempFileTtlMinutes);

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(rootPath)) {
            for (Path entry : stream) {
                if (Files.isDirectory(entry)) {
                    BasicFileAttributes attrs = Files.readAttributes(entry, BasicFileAttributes.class);
                    Instant lastModified = attrs.lastModifiedTime().toInstant();
                    if (lastModified.isBefore(cutoff)) {
                        log.info("Cleaning up orphaned temp directory: {}", entry.getFileName());
                        FileSystemUtils.deleteRecursively(entry);
                    }
                }
            }
        } catch (IOException e) {
            log.error("Error occurred during scheduled temp file cleanup sweep", e);
        }
    }
}
