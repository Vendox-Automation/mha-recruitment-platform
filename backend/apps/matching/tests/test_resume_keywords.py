"""Tests for resume keyword extraction (stdlib DOCX, pypdf PDF, honest empty)."""

from __future__ import annotations

from apps.matching.resume_keywords import extract_keywords
from apps.matching.tests.conftest import docx_bytes


def test_docx_extraction_via_stdlib():
    data = docx_bytes("Experienced in SQL Python and Tableau dashboards")
    keywords = extract_keywords(data, ".docx")
    assert "sql" in keywords
    assert "python" in keywords
    assert "tableau" in keywords
    # Stopwords/short tokens filtered.
    assert "and" not in keywords
    assert "in" not in keywords


def test_docx_extension_without_dot():
    keywords = extract_keywords(docx_bytes("Kubernetes Golang"), "docx")
    assert "kubernetes" in keywords
    assert "golang" in keywords


def test_empty_bytes_returns_empty_set():
    assert extract_keywords(b"", ".pdf") == set()
    assert extract_keywords(None, ".pdf") == set()


def test_unsupported_extension_returns_empty_set():
    assert extract_keywords(b"some bytes", ".txt") == set()


def test_corrupt_docx_returns_empty_set():
    # Not a valid ZIP -> zipfile raises -> honest empty set.
    assert extract_keywords(b"not a real docx", ".docx") == set()


def test_fake_pdf_returns_empty_set():
    # Bytes with the PDF magic but no real structure: pypdf cannot extract text,
    # extraction degrades to an honest empty set (the overlap factor -> unknown).
    fake_pdf = b"%PDF-1.4\nnot really a pdf body\n%%EOF\n"
    assert extract_keywords(fake_pdf, ".pdf") == set()
