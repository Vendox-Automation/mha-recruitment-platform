"""Lightweight, privacy-conscious resume keyword extraction (spec §16.2, §20.2).

Given raw resume bytes and a file extension, extract a lowercased keyword SET for
the Smart Job Fit resume-overlap factor. Design constraints:

* **Privacy-conscious** — only the derived keyword *set* is ever returned; the raw
  extracted text is never persisted or returned (ADR-0001 §5, spec §22.2). Callers
  store at most the keyword set (``CandidateProfile.resume_extracted_keywords_json``).
* **Honest failure** — on ANY extraction failure (corrupt file, unsupported type,
  empty document, parser error) this returns an EMPTY set. The engine then treats
  the resume-overlap factor as ``unknown`` and re-normalises (spec §16.2), rather
  than fabricating a misleading zero overlap.
* **Lightweight** — DOCX text comes from the stdlib (``zipfile`` reading
  ``word/document.xml`` with a tag strip; no third-party dependency). PDF text uses
  ``pypdf`` (pure-Python). No OCR, no layout analysis — best-effort plain text.
* **Synchronous** — runs inline (ADR-0001 §9.3 background-work boundary). A future
  async worker can call this unchanged.

This module performs no DB or network IO.
"""

from __future__ import annotations

import io
import re
import zipfile

from apps.matching.engine import tokenize_text

# Cap how much text we tokenise so a pathological file cannot blow up memory.
_MAX_TEXT_CHARS = 200_000
_XML_TAG_RE = re.compile(rb"<[^>]+>")


def _extract_docx_text(data: bytes) -> str:
    """Extract plain text from a DOCX using only the standard library.

    A DOCX is an OOXML ZIP; the body lives in ``word/document.xml``. We strip XML
    tags to recover a rough text stream — sufficient for keyword tokenisation.
    Any structural problem raises, and the caller converts that to an empty set.
    """
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        xml = zf.read("word/document.xml")
    # Insert spaces between tags so adjacent runs don't merge into one token.
    text = _XML_TAG_RE.sub(b" ", xml)
    return text.decode("utf-8", errors="ignore")


def _extract_pdf_text(data: bytes) -> str:
    """Extract plain text from a PDF using pypdf (pure-Python).

    Imported lazily so the dependency is only loaded when a PDF is actually
    processed and so the module imports cleanly even if pypdf were absent.
    """
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    parts: list[str] = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts)


def extract_keywords(data: bytes | None, extension: str) -> set[str]:
    """Return a lowercased keyword set extracted from resume ``data``.

    ``extension`` is the file extension (with or without a leading dot, any case),
    e.g. ``".pdf"`` or ``"docx"``. Returns an EMPTY set on any failure or when no
    usable text is found, so the resume-overlap factor degrades to an honest
    ``unknown`` rather than a fabricated score.
    """
    if not data:
        return set()

    ext = extension.lower().lstrip(".")
    try:
        if ext == "docx":
            text = _extract_docx_text(data)
        elif ext == "pdf":
            text = _extract_pdf_text(data)
        else:
            return set()
    except Exception:
        # Corrupt / unsupported / unreadable file → honest empty set.
        return set()

    if not text:
        return set()

    return tokenize_text(text[:_MAX_TEXT_CHARS])
