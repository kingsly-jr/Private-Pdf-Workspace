package com.pdfworkspace.exception;

import lombok.Getter;

@Getter
public class PdfWorkspaceException extends RuntimeException {

    private final String errorCode;
    private final String tool;

    public PdfWorkspaceException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.tool = null;
    }

    public PdfWorkspaceException(String errorCode, String message, String tool) {
        super(message);
        this.errorCode = errorCode;
        this.tool = tool;
    }
}
