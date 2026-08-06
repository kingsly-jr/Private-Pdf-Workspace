package com.pdfworkspace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PdfWorkspaceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PdfWorkspaceApplication.class, args);
    }
}
