from app.games.manager import Connection


class _DummyWS:
    pass


def test_connection_is_hashable_for_room_sets():
    conn = Connection(ws=_DummyWS(), user_id=1)
    s = {conn}
    assert conn in s
