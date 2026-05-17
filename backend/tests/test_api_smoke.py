"""End-to-end smoke test for the HTTP surface.

Exercises signup → vs-AI game → move → AI response → game history.
SQLite-backed; no Stripe/Anthropic keys required.
"""

from __future__ import annotations

from httpx import ASGITransport, AsyncClient


async def _client() -> AsyncClient:
    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test", follow_redirects=True)


async def test_signup_login_play_vs_ai_history():
    async with await _client() as c:
        # Health
        r = await c.get("/healthz")
        assert r.status_code == 200

        # Signup
        r = await c.post(
            "/api/auth/signup",
            json={
                "email": "u1@example.com",
                "password": "hunter22",
                "display_name": "U One",
                "city": "Алматы",
            },
        )
        assert r.status_code == 200, r.text
        me = r.json()
        assert me["email"] == "u1@example.com"
        assert me["rating"] == 1200
        assert "access_token" in c.cookies

        # /users/me
        r = await c.get("/api/users/me")
        assert r.status_code == 200
        assert r.json()["display_name"] == "U One"

        # Create vs-AI game (easy, white = us)
        r = await c.post(
            "/api/games/vs-ai",
            json={
                "difficulty": "easy",
                "player_color": "white",
                "time_control": {"initial_seconds": 60, "increment_seconds": 0},
            },
        )
        assert r.status_code == 200, r.text
        game = r.json()
        gid = game["id"]
        assert game["status"] == "active"
        assert game["mode"] == "vs_ai"

        # Find a legal first move for white from the initial position:
        # White man c3 -> d4 is always legal (path: [[5,2],[4,3]]).
        r = await c.post(
            f"/api/games/{gid}/move", json={"path": [[5, 2], [4, 3]]}
        )
        assert r.status_code == 200, r.text
        game = r.json()
        # Two plies should be recorded (ours + AI's reply).
        assert len(game["moves"]) >= 2
        assert game["moves"][0]["notation"].startswith("c3")
        assert game["status"] in {"active", "completed"}

        # History
        r = await c.get("/api/games/me/history")
        assert r.status_code == 200
        assert len(r.json()) == 1


async def test_leaderboard_endpoints_serve_signed_up_user():
    async with await _client() as c:
        r = await c.post(
            "/api/auth/signup",
            json={
                "email": "u2@example.com",
                "password": "hunter22",
                "display_name": "U Two",
                "city": "Астана",
            },
        )
        assert r.status_code == 200

        r = await c.get("/api/leaderboard/global")
        assert r.status_code == 200
        rows = r.json()
        assert any(e["display_name"] == "U Two" for e in rows)

        r = await c.get("/api/leaderboard/city", params={"city": "Астана"})
        assert r.status_code == 200
        rows = r.json()
        assert any(e["display_name"] == "U Two" for e in rows)


async def test_billing_config_works_without_keys():
    async with await _client() as c:
        r = await c.get("/api/billing/config")
        assert r.status_code == 200
        data = r.json()
        assert data["configured"] is False
        assert "skins" in data


async def test_friend_join_allows_guest_without_registration():
    async with await _client() as host:
        r = await host.post(
            "/api/auth/signup",
            json={
                "email": "host@example.com",
                "password": "hunter22",
                "display_name": "Host",
            },
        )
        assert r.status_code == 200

        r = await host.post(
            "/api/games/friend",
            json={"time_control": {"initial_seconds": 180, "increment_seconds": 0}},
        )
        assert r.status_code == 200
        game = r.json()
        token = game["friend_token"]
        gid = game["id"]

    async with await _client() as guest:
        r = await guest.post(f"/api/games/join/{token}")
        assert r.status_code == 200, r.text
        joined = r.json()
        assert joined["black_user_id"] is not None
        assert "access_token" in guest.cookies

        r = await guest.post(f"/api/auth/ws-ticket/{gid}")
        assert r.status_code == 200, r.text
        assert "ticket" in r.json()


async def test_expert_ai_requires_pro():
    async with await _client() as c:
        r = await c.post(
            "/api/games/vs-ai",
            json={
                "difficulty": "expert",
                "player_color": "white",
                "time_control": {"initial_seconds": 60, "increment_seconds": 0},
            },
        )
        assert r.status_code == 402


async def test_ranked_game_creation_and_join():
    async with await _client() as white:
        r = await white.post(
            "/api/auth/signup",
            json={
                "email": "ranked-white@example.com",
                "password": "hunter22",
                "display_name": "Ranked White",
            },
        )
        assert r.status_code == 200
        r = await white.post(
            "/api/games/ranked",
            json={"time_control": {"initial_seconds": 180, "increment_seconds": 2}},
        )
        assert r.status_code == 200, r.text
        game = r.json()
        assert game["mode"] == "ranked"
        token = game["friend_token"]

    async with await _client() as black:
        r = await black.post(
            "/api/auth/signup",
            json={
                "email": "ranked-black@example.com",
                "password": "hunter22",
                "display_name": "Ranked Black",
            },
        )
        assert r.status_code == 200
        r = await black.post(f"/api/games/join/{token}")
        assert r.status_code == 200, r.text
        joined = r.json()
        assert joined["mode"] == "ranked"
        assert joined["white_user_id"] is not None
        assert joined["black_user_id"] is not None


async def test_kids_mode_blocks_billing_endpoints():
    async with await _client() as c:
        r = await c.post(
            "/api/auth/signup",
            json={
                "email": "kid@example.com",
                "password": "hunter22",
                "display_name": "Kid User",
            },
        )
        assert r.status_code == 200
        r = await c.post("/api/users/kids-mode", json={"enabled": True, "pin": "1234"})
        assert r.status_code == 200
        assert r.json()["kids_mode"] is True

        r = await c.post("/api/billing/checkout", json={"plan": "monthly"})
        assert r.status_code == 403
        r = await c.post("/api/billing/portal")
        assert r.status_code == 403
