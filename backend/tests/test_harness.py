"""Tests for the harness's own safety properties.

CI runs the offline tier on every push, on a runner with no credentials. That
is only safe as long as the offline tier genuinely cannot reach the network, so
the guarantee is tested rather than assumed.
"""

from __future__ import annotations

import socket

import pytest

import gemini_service


def test_offline_tier_cannot_open_a_socket() -> None:
    """The autouse `no_network` guard must actually bite."""
    with pytest.raises(RuntimeError, match="offline tier attempted a network connection"):
        socket.create_connection(("generativelanguage.googleapis.com", 443), timeout=1)


def test_offline_tier_cannot_reach_gemini_even_if_a_key_leaks_in(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Belt and braces: with a key present, the client is constructible — the
    network guard is what stops the request, so quota cannot be spent."""
    monkeypatch.setenv("GEMINI_API_KEY", "AIza-not-a-real-key")
    gemini_service.get_client.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="network connection"):
            gemini_service.embed_text("anything")
    finally:
        gemini_service.get_client.cache_clear()


def test_missing_key_fails_before_any_request(monkeypatch: pytest.MonkeyPatch) -> None:
    """The CI runner's actual situation: no key at all."""
    monkeypatch.setenv("GEMINI_API_KEY", "")
    gemini_service.get_client.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="GEMINI_API_KEY is not set"):
            gemini_service.embed_text("anything")
    finally:
        gemini_service.get_client.cache_clear()
