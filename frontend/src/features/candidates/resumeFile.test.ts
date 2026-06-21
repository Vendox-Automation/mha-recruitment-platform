import { describe, expect, it } from "vitest";

import {
  precheckResumeFile,
  RESUME_MAX_BYTES,
} from "./resumeFile";

/** Build a File with a controllable size without allocating real bytes. */
function fakeFile(name: string, size: number): File {
  const file = new File(["x"], name, { type: "application/octet-stream" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("precheckResumeFile", () => {
  it("accepts a PDF within the size limit", () => {
    expect(precheckResumeFile(fakeFile("resume.pdf", 1024))).toEqual({
      ok: true,
      error: null,
    });
  });

  it("accepts a DOCX regardless of case in the extension", () => {
    expect(precheckResumeFile(fakeFile("CV.DOCX", 2048)).ok).toBe(true);
  });

  it("rejects a disallowed type with a fileType error", () => {
    expect(precheckResumeFile(fakeFile("resume.png", 1024))).toEqual({
      ok: false,
      error: "fileType",
    });
  });

  it("rejects a file with no extension as fileType", () => {
    expect(precheckResumeFile(fakeFile("resume", 1024)).error).toBe("fileType");
  });

  it("checks type before size so a too-large wrong-type file reports fileType", () => {
    expect(
      precheckResumeFile(fakeFile("resume.exe", RESUME_MAX_BYTES + 1)).error,
    ).toBe("fileType");
  });

  it("rejects a correctly-typed file over 5 MB with a fileSize error", () => {
    expect(
      precheckResumeFile(fakeFile("resume.pdf", RESUME_MAX_BYTES + 1)),
    ).toEqual({ ok: false, error: "fileSize" });
  });

  it("accepts a file exactly at the 5 MB boundary", () => {
    expect(precheckResumeFile(fakeFile("resume.pdf", RESUME_MAX_BYTES)).ok).toBe(
      true,
    );
  });

  it("rejects an empty file as fileSize", () => {
    expect(precheckResumeFile(fakeFile("resume.pdf", 0)).error).toBe("fileSize");
  });
});
